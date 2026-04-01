const {
  claimProfileAgent,
  createEvent,
  createId,
  findEvent,
  findProfileAgent,
  getEventSummary,
  upsertAttendees,
} = require("./store");
const { parseCsv, tokenizeList } = require("./csv");
const { applyDebrief, generateRecommendations } = require("./recommendations");

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
  return {
    events: getEventSummary(db),
    communities: db.communities,
    profileAgents: db.profileAgents,
    attendees: db.eventAttendees,
    eventAgents: db.eventAgents,
    recommendations: db.recommendations,
    debriefs: db.debriefs,
    analytics: db.analyticsEvents.slice(-20).reverse(),
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

function recommendationsAction(db, body) {
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

  return {
    event,
    requester,
    recommendations: ranked.map((item) => ({
      id: item.id,
      rank: item.rank,
      score: item.score,
      reason: item.reason,
      profileAgentId: item.profile.id,
      name: dbUserName(item.profile, db),
      affiliation: dbAffiliation(item.profile, db),
      bio: item.profile.bio,
    })),
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

  recordAnalytics(db, "debrief_completed", body.eventId, body.profileAgentId, {
    metCount: metPeople.length,
    usefulnessRating: Number(body.usefulnessRating || 0),
  });

  return { debrief };
}

module.exports = {
  buildDashboardPayload,
  createEventAction,
  claimProfileAction,
  debriefAction,
  importAttendeesAction,
  recommendationsAction,
};
