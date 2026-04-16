const {
  claimProfileAgent,
  createProfileAgent,
  createEvent,
  createId,
  findEvent,
  findProfileAgent,
  getEventSummary,
  now,
  upsertAttendees,
} = require("./store");
const { parseCsv, tokenizeList } = require("./csv");
const { applyDebrief, buildReason, generateRecommendations, scoreCandidate } = require("./recommendations");
const { generateDigestNarrative, generatePairingNarrative } = require("./pamoja-narrative");
const { resolveProvider, getProviderSettings } = require("./openai");

function getActiveProvider(db) {
  return resolveProvider(db.meta?.llmProvider);
}

function recordAnalytics(db, eventName, eventId, profileAgentId, payload) {
  db.analyticsEvents.push({
    id: createId("analytics"),
    eventName,
    eventId: eventId || null,
    profileAgentId: profileAgentId || null,
    payload: payload || {},
    createdAt: new Date().toISOString(),
  });
}

function buildDashboardPayload(db) {
  const uniquePeople = new Set(db.users.map((user) => user.id)).size;
  const stats = {
    totalEvents: db.events.length,
    totalPeople: uniquePeople,
    totalProfileAgents: db.profileAgents.length,
    totalEventAgents: db.eventAgents.length,
    totalMemories: db.profileMemory.length + db.interactionMemory.length + db.debriefs.length,
    communities: db.communities.length,
    simulationDay: db.meta?.simulationDay || 0,
  };

  return {
    stats,
    events: getEventSummary(db),
    communities: db.communities,
    users: db.users,
    profileAgents: db.profileAgents,
    attendees: db.eventAttendees,
    eventAgents: db.eventAgents,
    recommendations: db.recommendations,
    debriefs: db.debriefs,
    profileMemory: db.profileMemory,
    interactionMemory: db.interactionMemory,
    agentDigests: db.agentDigests || [],
    telegramConnections: db.telegramConnections || [],
    telegramMessages: (db.telegramMessages || []).slice(-30).reverse(),
    analytics: db.analyticsEvents.slice(-20).reverse(),
    integrations: {
      llmProvider: getActiveProvider(db),
      llmOptions: [
        {
          id: "openai",
          label: "OpenAI",
          enabled: Boolean(getProviderSettings("openai")),
          model: getProviderSettings("openai")?.model || "",
        },
        {
          id: "openrouter",
          label: "OpenRouter",
          enabled: Boolean(getProviderSettings("openrouter")),
          model: getProviderSettings("openrouter")?.model || "",
        },
      ],
    },
  };
}

function dbUserName(profileAgent, db) {
  const user = db.users.find((item) => item.id === profileAgent.userId);
  return user ? user.name : "Unknown attendee";
}

function dbAffiliation(profileAgent, db) {
  const user = db.users.find((item) => item.id === profileAgent.userId);
  return user ? user.affiliation : "";
}

function createEventAction(db, body) {
  const createdEvent = createEvent(db, {
    title: body.title,
    description: body.description,
    startAt: body.startAt,
    location: body.location,
    tags: (body.tags || []).map((tag) => String(tag).trim()).filter(Boolean),
    communityName: body.communityName,
  });

  recordAnalytics(db, "event_created", createdEvent.id, null, {
    title: createdEvent.title,
  });

  return { event: createdEvent };
}

function importAttendeesAction(db, eventId, csvText) {
  const rows = parseCsv(csvText || "");
  if (!rows.length) {
    throw new Error("CSV import needs at least one attendee row.");
  }

  if (!findEvent(db, eventId)) {
    throw new Error("Event not found.");
  }

  const createdAgents = upsertAttendees(
    db,
    eventId,
    rows.map((row) => ({
      ...row,
      interests: tokenizeList(row.interests),
      goals: tokenizeList(row.goals),
      looking_for: tokenizeList(row.looking_for || row.lookingfor || row.looking),
      preferences: tokenizeList(row.preferences),
    }))
  );

  recordAnalytics(db, "attendees_imported", eventId, null, { count: createdAgents.length });
  return { createdCount: createdAgents.length, profileAgents: createdAgents };
}

function claimProfileAction(db, profileAgentId, body) {
  const updatedAgent = claimProfileAgent(db, profileAgentId, {
    name: body.name,
    email: body.email,
    affiliation: body.affiliation,
    bio: body.bio,
    interests: tokenizeList(body.interestsText),
    goals: tokenizeList(body.goalsText),
    lookingFor: tokenizeList(body.lookingForText),
    preferences: tokenizeList(body.preferencesText),
    consentedMemory: body.consentedMemory,
  });

  if (!updatedAgent) {
    throw new Error("Profile Agent not found.");
  }

  recordAnalytics(db, "profile_claimed", updatedAgent.eventId, updatedAgent.id, {
    consentedMemory: updatedAgent.consentedMemory,
  });

  return { profileAgent: updatedAgent };
}

function createProfileAction(db, body) {
  const createdProfile = createProfileAgent(db, {
    eventId: body.eventId,
    name: body.name,
    email: body.email,
    affiliation: body.affiliation,
    bio: body.bio,
    interests: tokenizeList(body.interestsText),
    goals: tokenizeList(body.goalsText),
    lookingFor: tokenizeList(body.lookingForText),
    preferences: tokenizeList(body.preferencesText),
    consentedMemory: body.consentedMemory,
    relationStatus: body.relationStatus,
  });

  recordAnalytics(db, "profile_created", createdProfile.eventId, createdProfile.id, {
    consentedMemory: createdProfile.consentedMemory,
  });

  return { profileAgent: createdProfile };
}

async function recommendationsAction(db, body) {
  const event = findEvent(db, body.eventId);
  const requester = findProfileAgent(db, body.profileAgentId);

  if (!event || !requester) {
    throw new Error("Event or Profile Agent not found.");
  }

  const ranked = generateRecommendations(db, body.eventId, body.profileAgentId);
  recordAnalytics(db, "recommendations_requested", body.eventId, body.profileAgentId, {
    count: ranked.length,
    query: body.query || "Who should I meet at this event?",
  });

  const shapedRecommendations = ranked.map((item) => ({
    id: item.id,
    rank: item.rank,
    score: item.score,
    reason: item.reason,
    profileAgentId: item.profile.id,
    name: dbUserName(item.profile, db),
    affiliation: dbAffiliation(item.profile, db),
    bio: item.profile.bio,
  }));
  const fallbackNarrative = `${dbUserName(requester, db)} is best paired with ${shapedRecommendations
    .slice(0, 2)
    .map((item) => `${item.name} because ${item.reason}`)
    .join(" and ")}.`;
  const narrative = await generatePairingNarrative({
    requesterName: dbUserName(requester, db),
    requesterBio: requester.bio,
    eventTitle: event.title,
    eventTags: event.tags,
    recommendations: shapedRecommendations,
    fallbackNarrative,
    provider: getActiveProvider(db),
  });

  return {
    event,
    requester,
    narrative,
    recommendations: shapedRecommendations,
  };
}

function debriefAction(db, body) {
  const metPeople = (body.metProfileAgentIds || [])
    .map((profileAgentId) => {
      const profile = findProfileAgent(db, profileAgentId);
      if (!profile) {
        return null;
      }

      return {
        profileAgentId,
        name: dbUserName(profile, db),
      };
    })
    .filter(Boolean);

  const debrief = applyDebrief(db, {
    eventId: body.eventId,
    profileAgentId: body.profileAgentId,
    metPeople,
    notes: body.notes,
    usefulnessRating: Number(body.usefulnessRating || 0),
    followUp: Boolean(body.followUp),
  });

  if (!debrief) {
    throw new Error("Could not save debrief.");
  }

  debrief.simulationDay = Number(db.meta?.simulationDay || 0);

  recordAnalytics(db, "debrief_completed", body.eventId, body.profileAgentId, {
    metCount: metPeople.length,
    usefulnessRating: Number(body.usefulnessRating || 0),
  });

  return { debrief };
}

function buildEventThemeList(event, eventAgent) {
  return [...new Set([...(event?.tags || []), ...(eventAgent?.themes || [])])].filter(Boolean);
}

function uniqueValues(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function rotateList(items, offset) {
  if (!items.length) {
    return [];
  }

  const normalized = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalized), ...items.slice(0, normalized)];
}

function pickWindow(items, day, count) {
  return rotateList(items, day).slice(0, count);
}

function overlapTokens(requester, candidate) {
  return uniqueValues([
    ...(requester.interests || []).filter((item) =>
      [...(candidate.interests || []), ...(candidate.goals || []), ...(candidate.lookingFor || [])].includes(item)
    ),
    ...(requester.goals || []).filter((item) =>
      [...(candidate.interests || []), ...(candidate.goals || []), ...(candidate.lookingFor || [])].includes(item)
    ),
    ...(requester.lookingFor || []).filter((item) =>
      [...(candidate.interests || []), ...(candidate.goals || []), ...(candidate.lookingFor || [])].includes(item)
    ),
  ]);
}

function communityNameForEvent(db, eventId) {
  const event = db.events.find((item) => item.id === eventId);
  const community = db.communities.find((item) => item.id === event?.communityId);
  return community?.name || "Unknown community";
}

async function simulateAgentIterationAction(db, body) {
  if (!Array.isArray(db.agentDigests)) {
    db.agentDigests = [];
  }
  if (!db.meta) {
    db.meta = {};
  }

  const requester = findProfileAgent(db, body.profileAgentId);
  if (!requester) {
    throw new Error("Profile Agent not found.");
  }

  const requesterUser = db.users.find((item) => item.id === requester.userId);
  const nextDay = Number(db.meta?.simulationDay || 0) + 1;
  db.meta = {
    ...(db.meta || {}),
    simulationDay: nextDay,
  };

  const sweepAgents = (body.eventId
    ? db.profileAgents.filter((agent) => agent.eventId === body.eventId)
    : db.profileAgents
  ).filter((agent) => agent.id);

  sweepAgents.forEach((agent) => {
    generateRecommendations(db, agent.eventId, agent.id);
  });

  const crossEventCandidates = db.profileAgents.filter((agent) => agent.id !== requester.id);
  const scoredPeople = crossEventCandidates
    .map((candidate) => {
      const candidateEvent = findEvent(db, candidate.eventId);
      const eventAgent = db.eventAgents.find((agent) => agent.eventId === candidate.eventId);
      const priorInteraction = db.interactionMemory.find(
        (memory) =>
          (memory.profileAgentId === requester.id && memory.otherProfileAgentId === candidate.id) ||
          (memory.profileAgentId === candidate.id && memory.otherProfileAgentId === requester.id)
      );

      const score = scoreCandidate(requester, candidate, eventAgent, priorInteraction)
        + (candidate.eventId === requester.eventId ? 6 : 0);
      const reason = buildReason(requester, candidate, eventAgent, priorInteraction);

      return {
        candidate,
        candidateEvent,
        score,
        reason,
      };
    })
    .sort((left, right) => right.score - left.score);

  const topPeople = scoredPeople.slice(0, 3).map((item, index) => ({
    rank: index + 1,
    profileAgentId: item.candidate.id,
    name: dbUserName(item.candidate, db),
    affiliation: dbAffiliation(item.candidate, db),
    reason: item.reason,
    score: item.score,
    eventTitle: item.candidateEvent?.title || "Unknown event",
  }));

  const eventScores = db.events
    .map((event) => {
      const eventAgent = db.eventAgents.find((agent) => agent.eventId === event.id);
      const themes = buildEventThemeList(event, eventAgent);
      const themeScore =
        requester.interests.filter((interest) => themes.includes(interest)).length * 16 +
        requester.goals.filter((goal) => themes.includes(goal)).length * 18 +
        requester.lookingFor.filter((need) => themes.includes(need)).length * 12;
      const attendeeScore = scoredPeople
        .filter((item) => item.candidate.eventId === event.id)
        .slice(0, 2)
        .reduce((sum, item) => sum + item.score, 0);

      return {
        eventId: event.id,
        title: event.title,
        location: event.location,
        tags: event.tags,
        score: themeScore + attendeeScore,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  const communityScores = db.communities
    .map((community) => {
      const communityEvents = db.events.filter((event) => event.communityId === community.id);
      const score = communityEvents.reduce((sum, event) => {
        const matchingEvent = eventScores.find((item) => item.eventId === event.id);
        return sum + (matchingEvent?.score || 0);
      }, 0);
      const themeOverlap = communityEvents.reduce((sum, event) => {
        const themes = buildEventThemeList(event, db.eventAgents.find((agent) => agent.eventId === event.id));
        return (
          sum +
          requester.interests.filter((interest) => themes.includes(interest)).length * 8 +
          requester.goals.filter((goal) => themes.includes(goal)).length * 8
        );
      }, 0);

      return {
        communityId: community.id,
        name: community.name,
        description: community.description,
        score: score + themeOverlap,
        eventCount: communityEvents.length,
      };
    })
    .sort((left, right) => right.score - left.score);

  const bridgePeople = scoredPeople
    .filter((item) => item.candidate.eventId !== requester.eventId)
    .map((item) => ({
      profileAgentId: item.candidate.id,
      name: dbUserName(item.candidate, db),
      affiliation: dbAffiliation(item.candidate, db),
      reason: item.reason,
      eventTitle: item.candidateEvent?.title || "Unknown event",
      communityName: communityNameForEvent(db, item.candidate.eventId),
      overlap: overlapTokens(requester, item.candidate),
      score: item.score,
    }))
    .sort((left, right) => {
      if (right.overlap.length !== left.overlap.length) {
        return right.overlap.length - left.overlap.length;
      }
      return right.score - left.score;
    });

  const digestModes = [
    {
      id: "people",
      label: "People Sweep",
      summary: `${requesterUser?.name || "Your agent"} spent day ${nextDay} scanning people first, surfacing ${topPeople[0]?.name || "new contacts"} and ${topPeople[1]?.name || "strong operators"} as the highest-fit conversations to unlock now.`,
      people: pickWindow(topPeople, nextDay - 1, 3),
      events: pickWindow(eventScores, nextDay, 2),
      communities: pickWindow(communityScores, nextDay, 2),
      bridges: pickWindow(bridgePeople, nextDay - 1, 2),
      actions: [
        `Ask for an intro to ${topPeople[0]?.name || "a high-fit contact"} at ${topPeople[0]?.eventTitle || "their next event"}.`,
        `Prioritize rooms that combine ${requester.interests.slice(0, 2).join(" and ") || "your interests"} with operator density.`,
      ],
    },
    {
      id: "events",
      label: "Event Scout",
      summary: `${requesterUser?.name || "Your agent"} used day ${nextDay} to scout rooms instead of individuals, flagging ${eventScores[0]?.title || "strong events"} and ${eventScores[1]?.title || "new gatherings"} as the most promising next contexts.`,
      people: pickWindow(scoredPeople.map((item, index) => ({
        rank: index + 1,
        profileAgentId: item.candidate.id,
        name: dbUserName(item.candidate, db),
        affiliation: dbAffiliation(item.candidate, db),
        reason: item.reason,
        score: item.score,
        eventTitle: item.candidateEvent?.title || "Unknown event",
      })), nextDay + 1, 2),
      events: pickWindow(eventScores, nextDay - 1, 3),
      communities: pickWindow(communityScores, nextDay + 1, 2),
      bridges: pickWindow(bridgePeople, nextDay, 1),
      actions: [
        `Reserve attention for ${eventScores[0]?.title || "the strongest event"} before adding more direct outreach.`,
        `Use event context to meet people who care about ${eventScores[0]?.tags?.slice(0, 2).join(" and ") || "aligned themes"}.`,
      ],
    },
    {
      id: "communities",
      label: "Community Bridge Day",
      summary: `${requesterUser?.name || "Your agent"} spent day ${nextDay} looking for adjacent universes and found ${communityScores[0]?.name || "new communities"} plus ${communityScores[1]?.name || "crossovers"} as the most fertile ecosystems to enter next.`,
      people: pickWindow(bridgePeople, nextDay, 3),
      events: pickWindow(eventScores.filter((event) => event.eventId !== requester.eventId), nextDay, 2),
      communities: pickWindow(communityScores, nextDay - 1, 3),
      bridges: pickWindow(bridgePeople, nextDay + 1, 3),
      actions: [
        `Treat ${communityScores[0]?.name || "the top community"} as a new universe to explore over the next few days.`,
        `Use bridge people to cross from ${communityNameForEvent(db, requester.eventId)} into adjacent rooms.`,
      ],
    },
    {
      id: "serendipity",
      label: "Serendipity Sweep",
      summary: `${requesterUser?.name || "Your agent"} used day ${nextDay} for non-obvious discovery, surfacing unexpected overlaps like ${bridgePeople[0]?.name || "new bridges"} and rooms such as ${eventScores[eventScores.length - 1]?.title || eventScores[0]?.title || "surprising events"}.`,
      people: pickWindow(
        scoredPeople
          .slice()
          .sort((left, right) => {
            const leftOverlap = overlapTokens(requester, left.candidate).length;
            const rightOverlap = overlapTokens(requester, right.candidate).length;
            if (leftOverlap !== rightOverlap) {
              return leftOverlap - rightOverlap;
            }
            return right.score - left.score;
          })
          .map((item, index) => ({
            rank: index + 1,
            profileAgentId: item.candidate.id,
            name: dbUserName(item.candidate, db),
            affiliation: dbAffiliation(item.candidate, db),
            reason: item.reason,
            score: item.score,
            eventTitle: item.candidateEvent?.title || "Unknown event",
          })),
        nextDay,
        3
      ),
      events: pickWindow(eventScores.slice().reverse(), nextDay, 2),
      communities: pickWindow(communityScores.slice().reverse(), nextDay, 2),
      bridges: pickWindow(bridgePeople, nextDay - 1, 2),
      actions: [
        `Follow one surprising edge instead of only chasing the highest score.`,
        `Use the digest to test whether unexpected rooms lead to better long-term introductions.`,
      ],
    },
  ];

  const digestMode = digestModes[(nextDay - 1) % digestModes.length];

  const digest = {
    id: createId("digest"),
    profileAgentId: requester.id,
    userId: requester.userId,
    iteration: nextDay,
    mode: digestMode.id,
    modeLabel: digestMode.label,
    summary: digestMode.summary,
    people: digestMode.people,
    events: digestMode.events,
    communities: digestMode.communities,
    bridges: digestMode.bridges,
    actions: digestMode.actions,
    createdAt: now(),
  };

  const humanizedDigest = await generateDigestNarrative({
    requesterName: requesterUser?.name || "Your agent",
    modeLabel: digest.modeLabel,
    day: nextDay,
    people: digest.people,
    events: digest.events,
    communities: digest.communities,
    fallbackSummary: digest.summary,
    fallbackActions: digest.actions,
    provider: getActiveProvider(db),
  });

  digest.summary = humanizedDigest.summary;
  digest.actions = humanizedDigest.actions;

  db.agentDigests.push(digest);
  db.profileMemory.push({
    id: createId("memory"),
    profileAgentId: requester.id,
    memoryType: "agent_digest",
    content: `${digest.modeLabel}: ${digest.summary}`,
    sourceEventId: requester.eventId,
    createdAt: now(),
  });

  recordAnalytics(db, "agent_iteration_advanced", requester.eventId, requester.id, {
    iteration: nextDay,
    topEvent: digest.events[0]?.title || null,
    topPerson: digest.people[0]?.name || null,
    mode: digest.mode,
    sweepAgentCount: sweepAgents.length,
  });

  return { digest, sweepAgentCount: sweepAgents.length };
}

module.exports = {
  buildDashboardPayload,
  createEventAction,
  createProfileAction,
  claimProfileAction,
  debriefAction,
  importAttendeesAction,
  recommendationsAction,
  simulateAgentIterationAction,
};
