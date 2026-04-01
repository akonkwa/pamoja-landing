const { createId, now } = require("./store");

function normalizeList(items) {
  return (items || []).map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
}

function overlapScore(left, right, weight) {
  const leftSet = new Set(normalizeList(left));
  const rightSet = new Set(normalizeList(right));
  let matches = 0;

  leftSet.forEach((value) => {
    if (rightSet.has(value)) {
      matches += 1;
    }
  });

  return matches * weight;
}

function stringContainsAny(source, candidates) {
  const haystack = String(source || "").toLowerCase();
  return normalizeList(candidates).some((candidate) => haystack.includes(candidate));
}

function buildReason(requester, candidate, eventAgent, priorInteraction) {
  const reasons = [];

  if (overlapScore(requester.interests, candidate.interests, 1) > 0) {
    reasons.push("shared interests");
  }

  if (
    overlapScore(requester.goals, candidate.lookingFor, 1) > 0 ||
    overlapScore(requester.lookingFor, candidate.goals, 1) > 0
  ) {
    reasons.push("goal alignment");
  }

  if (stringContainsAny(candidate.bio, requester.lookingFor)) {
    reasons.push("direct fit for what you are seeking");
  }

  if (priorInteraction) {
    reasons.push("existing context from a prior interaction");
  }

  if (eventAgent && eventAgent.themes.length) {
    reasons.push(`strong fit for this event's ${eventAgent.themes.slice(0, 2).join(" and ")} theme`);
  }

  return reasons.slice(0, 2).join("; ") || "useful overlap based on profile and event context";
}

function scoreCandidate(requester, candidate, eventAgent, priorInteraction) {
  let score = 0;
  score += overlapScore(requester.interests, candidate.interests, 18);
  score += overlapScore(requester.goals, candidate.lookingFor, 24);
  score += overlapScore(requester.lookingFor, candidate.goals, 24);
  score += overlapScore(requester.preferences, candidate.preferences, 10);

  if (stringContainsAny(candidate.bio, requester.lookingFor)) {
    score += 14;
  }

  if (stringContainsAny(candidate.bio, requester.interests)) {
    score += 8;
  }

  if (priorInteraction) {
    score += 12 + Number(priorInteraction.usefulnessScore || 0);
  }

  if (eventAgent) {
    score += overlapScore(candidate.interests, eventAgent.themes, 6);
  }

  return score;
}

function generateRecommendations(db, eventId, requesterProfileAgentId) {
  const requester = db.profileAgents.find((agent) => agent.id === requesterProfileAgentId);
  const eventAgent = db.eventAgents.find((agent) => agent.eventId === eventId);

  if (!requester) {
    return [];
  }

  const candidates = db.profileAgents.filter(
    (agent) => agent.eventId === eventId && agent.id !== requesterProfileAgentId
  );

  const ranked = candidates
    .map((candidate) => {
      const priorInteraction = db.interactionMemory.find(
        (memory) =>
          memory.eventId === eventId &&
          ((memory.profileAgentId === requester.id &&
            memory.otherProfileAgentId === candidate.id) ||
            (memory.profileAgentId === candidate.id &&
              memory.otherProfileAgentId === requester.id))
      );

      const score = scoreCandidate(requester, candidate, eventAgent, priorInteraction);
      const reason = buildReason(requester, candidate, eventAgent, priorInteraction);

      return {
        id: createId("recommendation"),
        eventId,
        requesterProfileAgentId,
        recommendedProfileAgentId: candidate.id,
        rank: 0,
        reason,
        score,
        createdAt: now(),
        profile: candidate,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  db.recommendations = db.recommendations.filter(
    (item) =>
      !(item.eventId === eventId && item.requesterProfileAgentId === requesterProfileAgentId)
  );
  db.recommendations.push(...ranked.map(({ profile, ...recommendation }) => recommendation));

  return ranked;
}

function applyDebrief(db, payload) {
  const {
    eventId,
    profileAgentId,
    metPeople,
    notes,
    usefulnessRating,
    followUp,
  } = payload;

  const requester = db.profileAgents.find((agent) => agent.id === profileAgentId);

  if (!requester) {
    return null;
  }

  const debrief = {
    id: createId("debrief"),
    eventId,
    profileAgentId,
    metPeople,
    notes,
    usefulnessRating,
    createdAt: now(),
  };

  db.debriefs.push(debrief);

  (metPeople || []).forEach((person) => {
    db.interactionMemory.push({
      id: createId("interaction"),
      profileAgentId,
      otherProfileAgentId: person.profileAgentId,
      eventId,
      summary: `${requester.bio || requester.memorySummary || requester.id} met ${person.name}. ${notes || ""}`.trim(),
      usefulnessScore: usefulnessRating,
      followUpState: followUp ? "requested" : "none",
      createdAt: now(),
    });
  });

  requester.memorySummary = `Most recent event debrief: met ${metPeople.map((person) => person.name).join(", ") || "no one recorded"}; usefulness ${usefulnessRating || "n/a"}/5. ${notes || ""}`.trim();
  requester.updatedAt = now();

  db.profileMemory.push({
    id: createId("memory"),
    profileAgentId,
    memoryType: "debrief",
    content: requester.memorySummary,
    sourceEventId: eventId,
    createdAt: now(),
  });

  return debrief;
}

module.exports = {
  applyDebrief,
  generateRecommendations,
};
