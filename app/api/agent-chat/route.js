import { NextResponse } from "next/server";
import store from "../../../lib/store";
import { createId, now } from "../../../lib/store";
import pamojaService from "../../../lib/pamoja-service";
import {
  detectAgentCreationIntent,
  generateAgenticUniverseReply,
} from "../../../lib/pamoja-narrative";

const { updateDbAsync } = store;
const { createProfileAction } = pamojaService;

function cleanText(value) {
  return String(value || "").trim();
}

function splitItems(value) {
  return cleanText(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferEmail(name) {
  const slug = cleanText(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^[.]+|[.]+$)/g, "");

  return slug ? `${slug}@umoja.demo` : "";
}

function fallbackIntentParse(prompt) {
  const text = cleanText(prompt);
  const lower = text.toLowerCase();
  const wantsCreate =
    /\b(create|make|add|start)\b/.test(lower) &&
    /\b(agent|profile)\b/.test(lower);

  const nameMatch =
    text.match(/(?:agent|profile)\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})/) ||
    text.match(/for\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3})/);
  const goalsMatch = text.match(/goals?\s+(?:are|is|include)?\s*([^.;\n]+)/i);
  const interestsMatch = text.match(/interests?\s+(?:are|include)?\s*([^.;\n]+)/i);
  const bioMatch = text.match(/(?:about|bio)\s*(?:is|:)?\s*([^.;\n]+)/i);

  return {
    INTENT: wantsCreate ? "CREATE" : "CHAT",
    NAME: nameMatch ? nameMatch[1].trim() : "",
    BIO: bioMatch ? bioMatch[1].trim() : "",
    GOALS: goalsMatch ? goalsMatch[1].trim() : "",
    INTERESTS: interestsMatch ? interestsMatch[1].trim() : "",
    LOOKING_FOR: "",
    PREFERENCES: "",
    AFFILIATION: "",
    EMAIL: "",
  };
}

function buildProfilePayload({ eventId, prompt, parsedIntent }) {
  const inferred = fallbackIntentParse(prompt);
  const name = cleanText(parsedIntent.NAME || inferred.NAME);

  return {
    eventId,
    name,
    email: cleanText(parsedIntent.EMAIL || inferred.EMAIL || inferEmail(name)),
    affiliation: cleanText(parsedIntent.AFFILIATION || inferred.AFFILIATION || "Independent Builder"),
    bio: cleanText(
      parsedIntent.BIO ||
        inferred.BIO ||
        `Profile created from natural-language request: ${cleanText(prompt)}`
    ),
    interestsText: cleanText(parsedIntent.INTERESTS || inferred.INTERESTS),
    goalsText: cleanText(parsedIntent.GOALS || inferred.GOALS),
    lookingForText: cleanText(parsedIntent.LOOKING_FOR || inferred.LOOKING_FOR),
    preferencesText: cleanText(parsedIntent.PREFERENCES || inferred.PREFERENCES || "warm intros"),
    consentedMemory: true,
    relationStatus: "attending",
  };
}

function shouldCreateAgent(parsedIntent, prompt) {
  const inferred = fallbackIntentParse(prompt);
  return (parsedIntent.INTENT || inferred.INTENT || "").toUpperCase() === "CREATE";
}

function normalizeText(value) {
  return cleanText(value).toLowerCase();
}

function tokenizeQuery(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function summarizeProfileAgent(profile, db) {
  if (!profile) {
    return null;
  }

  const user = db.users.find((item) => item.id === profile.userId);
  const event = db.events.find((item) => item.id === profile.eventId);
  return {
    profileAgentId: profile.id,
    name: user?.name || "Unknown person",
    affiliation: user?.affiliation || "",
    bio: profile.bio || "",
    goals: profile.goals || [],
    interests: profile.interests || [],
    lookingFor: profile.lookingFor || [],
    eventTitle: event?.title || "",
    relationStatus:
      db.eventAttendees.find((item) => item.id === profile.attendeeId)?.relationStatus || "unknown",
  };
}

function findRelevantProfiles(db, question, selectedProfile) {
  const tokens = tokenizeQuery(question);
  const selectedSummary = summarizeProfileAgent(selectedProfile, db);
  const seenUsers = new Set();

  return db.profileAgents
    .map((profile) => {
      const summary = summarizeProfileAgent(profile, db);
      const haystack = normalizeText(
        [
          summary.name,
          summary.affiliation,
          summary.bio,
          summary.eventTitle,
          ...(summary.goals || []),
          ...(summary.interests || []),
          ...(summary.lookingFor || []),
        ].join(" ")
      );

      let score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 4 : 0), 0);
      if (selectedSummary) {
        const overlap = [
          ...(summary.goals || []),
          ...(summary.interests || []),
          ...(summary.lookingFor || []),
        ].filter((item) =>
          [...(selectedSummary.goals || []), ...(selectedSummary.interests || []), ...(selectedSummary.lookingFor || [])]
            .map(normalizeText)
            .includes(normalizeText(item))
        );
        score += overlap.length * 3;
      }
      if (profile.id === selectedProfile?.id) {
        score += 2;
      }

      return { summary, score };
    })
    .sort((left, right) => right.score - left.score)
    .filter(({ summary, score }) => {
      if (seenUsers.has(summary.name)) {
        return false;
      }
      if (score <= 0 && selectedSummary && summary.profileAgentId !== selectedSummary.profileAgentId) {
        return false;
      }
      seenUsers.add(summary.name);
      return true;
    })
    .slice(0, 6)
    .map(({ summary, score }) => ({ ...summary, score }));
}

function findRelevantEvents(db, question, selectedProfile) {
  const tokens = tokenizeQuery(question);
  const selectedSummary = summarizeProfileAgent(selectedProfile, db);

  return db.events
    .map((event) => {
      const attendeeCount = db.eventAttendees.filter((item) => item.eventId === event.id).length;
      const haystack = normalizeText(
        [event.title, event.description, event.location, ...(event.tags || [])].join(" ")
      );
      let score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 5 : 0), 0);
      if (selectedSummary) {
        const overlap = (event.tags || []).filter((tag) =>
          [...(selectedSummary.goals || []), ...(selectedSummary.interests || []), ...(selectedSummary.lookingFor || [])]
            .map(normalizeText)
            .some((value) => value.includes(normalizeText(tag)) || normalizeText(tag).includes(value))
        );
        score += overlap.length * 3;
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        tags: event.tags || [],
        attendeeCount,
        score,
      };
    })
    .sort((left, right) => right.score - left.score || right.attendeeCount - left.attendeeCount)
    .slice(0, 5);
}

function findRelevantMemory(db, question, selectedProfile) {
  const tokens = tokenizeQuery(question);
  const selectedId = selectedProfile?.id || null;
  const selectedEventId = selectedProfile?.eventId || null;

  const memoryRows = [
    ...(db.profileMemory || []).map((item) => ({ ...item, type: item.memoryType || "profile_memory" })),
    ...(db.interactionMemory || []).map((item) => ({ ...item, type: "interaction_memory", content: item.summary || "" })),
    ...(db.debriefs || []).map((item) => ({ ...item, type: "debrief_memory", content: item.notes || "" })),
    ...(db.agentDigests || []).map((item) => ({ ...item, type: "digest_memory", content: item.summary || "" })),
  ];

  return memoryRows
    .map((item) => {
      const haystack = normalizeText(item.content || "");
      let score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 4 : 0), 0);
      if (selectedId && (item.profileAgentId === selectedId || item.otherProfileAgentId === selectedId)) {
        score += 3;
      }
      if (selectedEventId && item.sourceEventId === selectedEventId) {
        score += 2;
      }
      if (item.type === "agent_chat") {
        score -= 3;
      }
      if (item.type === "debrief") {
        score += 2;
      }
      return {
        type: item.type,
        score,
        content: cleanText(item.content || "").slice(0, 220),
        profileAgentId: item.profileAgentId || null,
        sourceEventId: item.sourceEventId || item.eventId || null,
      };
    })
    .filter((item) => item.score > 0 || (selectedId && item.profileAgentId === selectedId))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
}

function findRelevantRecommendations(db, question, selectedProfile, selectedEvent) {
  const tokens = tokenizeQuery(question);
  const selectedId = selectedProfile?.id || null;
  const selectedEventId = selectedEvent?.id || selectedProfile?.eventId || null;
  const pairedQuery = tokens.some((token) => ["pair", "paired", "match", "matched", "meet"].includes(token));

  const recommendations = (db.recommendations || [])
    .map((recommendation) => {
      const requester = db.profileAgents.find((item) => item.id === recommendation.requesterProfileAgentId);
      const candidate = db.profileAgents.find((item) => item.id === recommendation.recommendedProfileAgentId);
      const requesterUser = requester ? db.users.find((item) => item.id === requester.userId) : null;
      const candidateUser = candidate ? db.users.find((item) => item.id === candidate.userId) : null;
      const haystack = normalizeText(
        [
          recommendation.reason,
          requesterUser?.name,
          candidateUser?.name,
          candidate?.bio,
        ].join(" ")
      );

      let score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 5 : 0), 0);
      if (selectedId && recommendation.requesterProfileAgentId === selectedId) {
        score += 8;
      }
      if (selectedEventId && recommendation.eventId === selectedEventId) {
        score += 4;
      }
      if (pairedQuery && selectedId && recommendation.requesterProfileAgentId === selectedId) {
        score += 10;
      }

      return {
        requesterProfileAgentId: recommendation.requesterProfileAgentId,
        recommendedProfileAgentId: recommendation.recommendedProfileAgentId,
        requesterName: requesterUser?.name || "Unknown requester",
        recommendedName: candidateUser?.name || "Unknown person",
        reason: recommendation.reason,
        rank: recommendation.rank,
        score: recommendation.score,
        eventId: recommendation.eventId,
        relevance: score,
      };
    })
    .filter((item) => item.relevance > 0 || (selectedId && item.requesterProfileAgentId === selectedId))
    .sort((left, right) => right.relevance - left.relevance || left.rank - right.rank)
    .slice(0, 6);

  return recommendations;
}

function buildToolContext(toolResults) {
  return [
    "TOOL: query_profiles",
    ...(toolResults.profiles.length
      ? toolResults.profiles.map(
          (item) =>
            `- ${item.name} | ${item.affiliation || "n/a"} | event=${item.eventTitle || "n/a"} | goals=${item.goals.join(", ") || "n/a"} | interests=${item.interests.join(", ") || "n/a"} | looking_for=${item.lookingFor.join(", ") || "n/a"}`
        )
      : ["- no matching profiles"]),
    "",
    "TOOL: query_events",
    ...(toolResults.events.length
      ? toolResults.events.map(
          (item) =>
            `- ${item.title} | tags=${item.tags.join(", ") || "n/a"} | attendees=${item.attendeeCount} | location=${item.location || "n/a"}`
        )
      : ["- no matching events"]),
    "",
    "TOOL: query_memory",
    ...(toolResults.memory.length
      ? toolResults.memory.map(
          (item) =>
            `- ${item.type} | event=${item.sourceEventId || "n/a"} | ${item.content}`
        )
      : ["- no matching memory"]),
    "",
    "TOOL: query_recommendations",
    ...(toolResults.recommendations.length
      ? toolResults.recommendations.map(
          (item) =>
            `- requester=${item.requesterName} | recommended=${item.recommendedName} | rank=${item.rank} | reason=${item.reason}`
        )
      : ["- no pairing history found"]),
  ].join("\n");
}

function buildFallbackReply({ selectedProfile, selectedEvent, toolResults }) {
  const topProfile = toolResults.profiles[0];
  const topEvent = toolResults.events[0] || selectedEvent;
  const topMemory = toolResults.memory.find(
    (item) => item.type !== "agent_chat" && item.type !== "profile_memory"
  ) || null;
  const topRecommendation = toolResults.recommendations[0];

  if (selectedProfile) {
    if (topRecommendation && topRecommendation.requesterProfileAgentId === selectedProfile.id) {
      return `I have already been paired with ${topRecommendation.recommendedName} as my top match for ${topEvent?.title || "this event"}. The strongest reason is ${topRecommendation.reason}.${topMemory ? ` The best supporting signal is recent ${topMemory.type.replace(/_/g, " ")} activity tied to this event.` : ""}`.trim();
    }

    return `I am prioritizing ${topProfile?.name || "the strongest matching person"} and the most relevant room looks like ${topEvent?.title || "this event"}.${topMemory ? ` I also have recent ${topMemory.type.replace(/_/g, " ")} context to work from.` : ""}`.trim();
  }

  if (topRecommendation) {
    return `I can see that ${topRecommendation.requesterName} has already been paired with ${topRecommendation.recommendedName}. The strongest reason is ${topRecommendation.reason}.${topEvent ? ` The relevant room around that pairing is ${topEvent.title}.` : ""}`.trim();
  }

  return `I can see the strongest current signals around ${topProfile?.name || "the top matching people"} and ${topEvent?.title || "the most relevant event"}.${topMemory ? ` There is also recent ${topMemory.type.replace(/_/g, " ")} context in the universe.` : ""}`.trim();
}

export async function POST(request) {
  const body = await request.json();
  let payload;

  try {
    await updateDbAsync(async (db) => {
      const selectedEvent =
        db.events.find((item) => item.id === body.eventId) ||
        db.events[0] ||
        null;
      const selectedProfile = body.profileAgentId
        ? db.profileAgents.find((item) => item.id === body.profileAgentId) || null
        : null;

      const intent =
        (await detectAgentCreationIntent({
          prompt: body.question,
          selectedEventTitle: selectedEvent?.title,
          fallbackName: selectedProfile
            ? db.users.find((item) => item.id === selectedProfile.userId)?.name
            : "",
          provider: db.meta?.llmProvider,
        }).catch(() => fallbackIntentParse(body.question))) || fallbackIntentParse(body.question);

      if (shouldCreateAgent(intent, body.question)) {
        if (!selectedEvent) {
          throw new Error("Event not found.");
        }

        const profilePayload = buildProfilePayload({
          eventId: selectedEvent.id,
          prompt: body.question,
          parsedIntent: intent,
        });

        if (!profilePayload.name) {
          throw new Error("I understood this as a create-agent request, but I could not find a name.");
        }

        const created = createProfileAction(db, profilePayload);
        const createdUser = db.users.find((item) => item.id === created.profileAgent.userId);

        db.profileMemory.push({
          id: createId("memory"),
          profileAgentId: created.profileAgent.id,
          memoryType: "agent_chat_create",
          content: `Created from prompt: ${body.question}`,
          sourceEventId: selectedEvent.id,
          createdAt: now(),
        });

        payload = {
          mode: "create",
          reply: `I created ${createdUser?.name || profilePayload.name} as a profile agent for ${selectedEvent.title}.`,
          profileAgent: created.profileAgent,
          eventId: selectedEvent.id,
        };
        return db;
      }

      const profile = selectedProfile;
      const user = profile ? db.users.find((item) => item.id === profile.userId) : null;
      const event = profile
        ? db.events.find((item) => item.id === profile.eventId)
        : selectedEvent;
      const latestDigest = (db.agentDigests || [])
        .filter((item) => !profile || item.profileAgentId === profile.id)
        .slice()
        .sort((left, right) => right.iteration - left.iteration)[0];
      const latestDebrief = (db.debriefs || [])
        .filter((item) => !profile || item.profileAgentId === profile.id)
        .slice()
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];

      const toolResults = {
        profiles: findRelevantProfiles(db, body.question, profile),
        events: findRelevantEvents(db, body.question, profile),
        memory: findRelevantMemory(db, body.question, profile),
        recommendations: findRelevantRecommendations(db, body.question, profile, event),
      };
      const fallbackReply = buildFallbackReply({
        selectedProfile: profile,
        selectedEvent: event,
        toolResults,
      });
      const answer = await generateAgenticUniverseReply({
        personaName: user?.name || "Universe Guide",
        personaMode: profile ? "profile_agent" : "universe_guide",
        affiliation: user?.affiliation || "",
        bio: profile?.bio || "",
        goals: profile?.goals || [],
        lookingFor: profile?.lookingFor || [],
        selectedEvent: event,
        question: body.question,
        toolContext: buildToolContext(toolResults),
        fallbackReply,
        provider: db.meta?.llmProvider,
      });

      db.profileMemory.push({
        id: createId("memory"),
        profileAgentId: profile?.id || null,
        memoryType: "agent_chat",
        content: `Q: ${body.question} A: ${answer.reply}`,
        sourceEventId: profile?.eventId || event?.id || null,
        createdAt: now(),
      });

      payload = {
        mode: "chat",
        reply: answer.reply,
        source: answer.source,
        confidence: answer.confidence,
        toolNames: ["query_profiles", "query_events", "query_memory", "query_recommendations"],
        profileAgentId: profile?.id || null,
      };
      return db;
    });
  } catch (error) {
    const status =
      error.message === "Profile Agent not found." ||
      error.message === "Event not found." ||
      error.message === "Select a profile agent before prompting it." ||
      error.message === "I understood this as a create-agent request, but I could not find a name."
        ? 400
        : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(payload, { status: 201 });
}
