const { parseCsv, tokenizeList } = require("./csv");
const {
  claimProfileAgent,
  createId,
  createEvent,
  findEvent,
  findProfileAgent,
  getEventSummary,
  readDb,
  updateDb,
  upsertAttendees,
} = require("./store");
const { applyDebrief, generateRecommendations } = require("./recommendations");

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
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

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/dashboard") {
    sendJson(res, 200, buildDashboardPayload(readDb()));
    return true;
  }

  if (req.method === "POST" && pathname === "/api/events") {
    const body = await parseBody(req);

    if (!body.title) {
      sendError(res, 400, "Event title is required.");
      return true;
    }

    let createdEvent = null;
    updateDb((draft) => {
      createdEvent = createEvent(draft, {
        title: body.title,
        description: body.description,
        startAt: body.startAt,
        location: body.location,
        tags: (body.tags || []).map((tag) => String(tag).trim()).filter(Boolean),
        communityName: body.communityName,
      });
      recordAnalytics(draft, "event_created", createdEvent.id, null, {
        title: createdEvent.title,
      });
      return draft;
    });

    sendJson(res, 201, { event: createdEvent });
    return true;
  }

  const importMatch = pathname.match(/^\/api\/events\/([^/]+)\/attendees\/import$/);
  if (req.method === "POST" && importMatch) {
    const [, eventId] = importMatch;
    const body = await parseBody(req);
    const rows = parseCsv(body.csvText || "");

    if (!rows.length) {
      sendError(res, 400, "CSV import needs at least one attendee row.");
      return true;
    }

    const dbSnapshot = readDb();
    if (!findEvent(dbSnapshot, eventId)) {
      sendError(res, 404, "Event not found.");
      return true;
    }

    let createdAgents = [];
    updateDb((db) => {
      createdAgents = upsertAttendees(
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
      return db;
    });

    sendJson(res, 201, { createdCount: createdAgents.length, profileAgents: createdAgents });
    return true;
  }

  const claimMatch = pathname.match(/^\/api\/profile-agents\/([^/]+)\/claim$/);
  if (req.method === "POST" && claimMatch) {
    const [, profileAgentId] = claimMatch;
    const body = await parseBody(req);
    let updatedAgent = null;

    updateDb((db) => {
      updatedAgent = claimProfileAgent(db, profileAgentId, {
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

      if (updatedAgent) {
        recordAnalytics(db, "profile_claimed", updatedAgent.eventId, updatedAgent.id, {
          consentedMemory: updatedAgent.consentedMemory,
        });
      }

      return db;
    });

    if (!updatedAgent) {
      sendError(res, 404, "Profile Agent not found.");
      return true;
    }

    sendJson(res, 200, { profileAgent: updatedAgent });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/recommendations/query") {
    const body = await parseBody(req);
    let ranked = [];
    let event = null;
    let requester = null;
    let dbAfterUpdate = null;

    dbAfterUpdate = updateDb((db) => {
      event = findEvent(db, body.eventId);
      requester = findProfileAgent(db, body.profileAgentId);

      if (!event || !requester) {
        return db;
      }

      ranked = generateRecommendations(db, body.eventId, body.profileAgentId);
      recordAnalytics(db, "recommendations_requested", body.eventId, body.profileAgentId, {
        count: ranked.length,
        query: body.query || "Who should I meet at this event?",
      });
      return db;
    });

    if (!event || !requester) {
      sendError(res, 404, "Event or Profile Agent not found.");
      return true;
    }

    sendJson(res, 200, {
      event,
      requester,
      recommendations: ranked.map((item) => ({
        id: item.id,
        rank: item.rank,
        score: item.score,
        reason: item.reason,
        profileAgentId: item.profile.id,
        name: dbUserName(item.profile, dbAfterUpdate),
        affiliation: dbAffiliation(item.profile, dbAfterUpdate),
        bio: item.profile.bio,
      })),
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/debriefs") {
    const body = await parseBody(req);
    let debrief = null;

    updateDb((db) => {
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

      debrief = applyDebrief(db, {
        eventId: body.eventId,
        profileAgentId: body.profileAgentId,
        metPeople,
        notes: body.notes,
        usefulnessRating: Number(body.usefulnessRating || 0),
        followUp: Boolean(body.followUp),
      });

      if (debrief) {
        recordAnalytics(db, "debrief_completed", body.eventId, body.profileAgentId, {
          metCount: metPeople.length,
          usefulnessRating: Number(body.usefulnessRating || 0),
        });
      }

      return db;
    });

    if (!debrief) {
      sendError(res, 404, "Could not save debrief.");
      return true;
    }

    sendJson(res, 201, { debrief });
    return true;
  }

  return false;
}

function dbUserName(profileAgent, db) {
  const user = db.users.find((item) => item.id === profileAgent.userId);
  return user ? user.name : "Unknown attendee";
}

function dbAffiliation(profileAgent, db) {
  const user = db.users.find((item) => item.id === profileAgent.userId);
  return user ? user.affiliation : "";
}

module.exports = {
  handleApi,
};
