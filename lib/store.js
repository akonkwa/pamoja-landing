const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function now() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString("hex")}`;
}

function unique(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function toSentenceCase(items) {
  return unique(items).map((item) => item.trim());
}

function listFromRow(...candidates) {
  const found = candidates.find((candidate) => Array.isArray(candidate) || candidate);

  if (!found) {
    return [];
  }

  if (Array.isArray(found)) {
    return toSentenceCase(found);
  }

  return toSentenceCase([found]);
}

function buildSeedUniverse() {
  const communityId = "community_demo";
  const people = [
    ["ada", "Ada Nwosu", "Catalyst Fellows", "Building climate adaptation marketplaces for coastal cities.", ["climate", "marketplaces", "policy"], ["find pilot city partners", "meet ecosystem operators"], ["municipal partners", "community builders"], ["warm intros", "operators"]],
    ["kwame", "Kwame Boateng", "Harbor Labs", "Operator supporting public-private urban resilience pilots.", ["climate", "partnerships", "cities"], ["source startups for pilots", "meet technical founders"], ["founders", "policy translators"], ["practical builders", "high-context conversations"]],
    ["priya", "Priya Raman", "Latitude Ventures", "Investor exploring workflow software and marketplace infrastructure.", ["marketplaces", "venture", "fintech"], ["find strong founders", "understand climate adjacency"], ["fundable teams", "repeat founders"], ["clear traction", "strong operators"]],
    ["maya", "Maya Okafor", "Commons Studio", "Designs rituals and programming for fellowship-style communities.", ["community", "fellowships", "program design"], ["increase trust density", "meet technical collaborators"], ["community operators", "product thinkers"], ["generous people", "systems thinkers"]],
    ["daniel", "Daniel Mensah", "Mesh Protocol", "Building identity and coordination tools for recurring communities.", ["identity", "communities", "agent systems"], ["find design partners", "meet network organizers"], ["community leads", "pilot programs"], ["productive intros", "clear use cases"]],
    ["lina", "Lina Park", "Northstar Labs", "Building tooling for founder communities and event operations.", ["community", "founders", "software"], ["find pilot partners", "meet operators"], ["community builders", "design partners"], ["warm intros", "practical builders"]],
    ["samuel", "Samuel Osei", "CityBridge", "Runs urban resilience programs and public-private pilots.", ["climate", "cities", "partnerships"], ["find startups for pilots"], ["founders", "policy translators"], ["clear use cases", "operators"]],
    ["imani", "Imani Cole", "Canvas Capital", "Investor focused on workflow products and community software.", ["venture", "community", "workflow"], ["meet strong founders", "understand event intelligence"], ["fundable teams", "repeat builders"], ["traction", "focused conversations"]],
    ["noah", "Noah Stein", "Relay Works", "Product lead building software for alumni and member networks.", ["alumni", "product", "communities"], ["learn from operators", "find distribution partners"], ["network organizers", "design-minded founders"], ["clarity", "execution"]],
    ["zuri", "Zuri Diallo", "Open Guild", "Community architect for founder houses and shared workspaces.", ["community", "spaces", "hospitality"], ["find sponsors", "meet systems builders"], ["operators", "funders"], ["trust", "long-term thinking"]],
    ["omar", "Omar Farouk", "Civic Stack", "Policy technologist connecting founders with public-sector buyers.", ["policy", "govtech", "partnerships"], ["meet founders", "source pilot demand"], ["technical teams", "operators"], ["mission fit", "speed"]],
    ["sofia", "Sofia Almeida", "Blue Current", "Climate financier working on blended capital and project origination.", ["climate", "finance", "infrastructure"], ["find bankable teams", "meet city operators"], ["project developers", "ecosystem builders"], ["substance", "strong operators"]],
    ["tariq", "Tariq Bell", "Signal House", "Hosts salons for technical founders and civic builders.", ["events", "founders", "civic tech"], ["curate stronger rooms", "meet community designers"], ["operators", "facilitators"], ["taste", "high-signal conversations"]],
    ["eleni", "Eleni Kass", "Scholar Engine", "Building tools for alumni mentorship and cohort accountability.", ["alumni", "education", "workflows"], ["meet distribution partners", "find pilot schools"], ["community leads", "operators"], ["clarity", "follow-through"]],
    ["jules", "Jules Pereira", "Orbit Health", "Health systems founder looking for strategic partnerships.", ["health", "systems", "partnerships"], ["meet operators", "find investors"], ["pilot sites", "capital partners"], ["speed", "useful intros"]],
    ["amina", "Amina Yusuf", "Bridge Commons", "Leads member experience for cross-border founder communities.", ["community", "member experience", "operations"], ["improve onboarding", "meet software builders"], ["product teams", "network operators"], ["service", "clarity"]],
    ["gabriel", "Gabriel Chen", "Sunline AI", "Building AI copilots for program managers and event teams.", ["ai", "workflows", "events"], ["meet design partners", "find community operators"], ["pilot customers", "ops leaders"], ["fast feedback", "clear pain points"]],
    ["nora", "Nora Bedi", "Forum North", "Runs intimate policy dinners and operator roundtables.", ["policy", "events", "community"], ["curate stronger attendance", "meet systems thinkers"], ["operators", "facilitators"], ["warmth", "high-context rooms"]],
    ["leo", "Leo Martins", "SeedForge", "Angel investor supporting repeat founders in emerging ecosystems.", ["venture", "ecosystems", "founders"], ["find strong operators", "meet builders"], ["repeat founders", "community leads"], ["signal", "trajectory"]],
    ["chioma", "Chioma Eze", "Afterglow Labs", "Researches trust formation in repeated in-person communities.", ["trust", "research", "communities"], ["study event patterns", "meet product builders"], ["community operators", "research partners"], ["depth", "care"]],
  ].map(([key, name, affiliation, bio, interests, goals, lookingFor, preferences]) => ({
    key,
    userId: `seed_user_${key}`,
    email: `${key}@pamoja.demo`,
    name,
    affiliation,
    bio,
    interests,
    goals,
    lookingFor,
    preferences,
  }));

  const events = [
    {
      id: "seed_event_founder_salon",
      title: "Founder Salon",
      description: "Event agent represents who has attended, is attending, and will attend this recurring founder salon.",
      startAt: "2026-03-10T18:30:00.000Z",
      location: "Cambridge, MA",
      tags: ["founders", "operators", "community"],
      participants: [["ada", "has_attended"], ["kwame", "has_attended"], ["maya", "has_attended"], ["daniel", "has_attended"], ["leo", "has_attended"], ["chioma", "has_attended"], ["tariq", "has_attended"]],
    },
    {
      id: "seed_event_climate_dinner",
      title: "Climate Operator Dinner",
      description: "Event agent represents attendance relationships around climate pilots and partnerships.",
      startAt: "2026-03-22T23:00:00.000Z",
      location: "Boston, MA",
      tags: ["climate", "operators", "pilots"],
      participants: [["ada", "attending"], ["kwame", "attending"], ["samuel", "attending"], ["sofia", "attending"], ["omar", "attending"], ["jules", "will_attend"], ["priya", "will_attend"]],
    },
    {
      id: "seed_event_systems_jam",
      title: "Community Systems Jam",
      description: "Event agent represents the people exploring how community memory and agent tooling connect.",
      startAt: "2026-04-03T17:00:00.000Z",
      location: "Somerville, MA",
      tags: ["community", "systems", "agents"],
      participants: [["maya", "will_attend"], ["daniel", "will_attend"], ["lina", "will_attend"], ["gabriel", "will_attend"], ["amina", "will_attend"], ["chioma", "will_attend"], ["nora", "will_attend"], ["noah", "will_attend"]],
    },
    {
      id: "seed_event_policy_breakfast",
      title: "Policy Builders Breakfast",
      description: "Event agent represents policy-centric attendance ties across operators, founders, and civic builders.",
      startAt: "2026-04-12T13:00:00.000Z",
      location: "Washington, DC",
      tags: ["policy", "civic", "partnerships"],
      participants: [["omar", "will_attend"], ["nora", "will_attend"], ["tariq", "will_attend"], ["ada", "will_attend"], ["kwame", "will_attend"], ["sofia", "will_attend"]],
    },
    {
      id: "seed_event_capital_mixer",
      title: "Capital and Operators Mixer",
      description: "Event agent represents investor-founder-operator attendance links for a high-context capital room.",
      startAt: "2026-04-20T22:00:00.000Z",
      location: "New York, NY",
      tags: ["venture", "founders", "operators"],
      participants: [["priya", "will_attend"], ["imani", "will_attend"], ["leo", "will_attend"], ["jules", "will_attend"], ["lina", "will_attend"], ["samuel", "will_attend"], ["eleni", "will_attend"]],
    },
    {
      id: "seed_event_alumni_demo",
      title: "Alumni Demo Night",
      description: "Event agent represents attendance ties across alumni, operators, and product builders.",
      startAt: "2026-05-02T23:30:00.000Z",
      location: "Providence, RI",
      tags: ["alumni", "demos", "community"],
      participants: [["noah", "will_attend"], ["eleni", "will_attend"], ["gabriel", "will_attend"], ["amina", "will_attend"], ["chioma", "will_attend"], ["maya", "will_attend"], ["daniel", "will_attend"]],
    },
  ];

  return {
    communityId,
    people,
    events,
  };
}

function buildDemoData() {
  const universe = buildSeedUniverse();
  const users = universe.people.map((row) => ({
    id: row.userId,
    email: row.email,
    name: row.name,
    affiliation: row.affiliation,
    createdAt: now(),
  }));

  const events = universe.events.map((event) => ({
    id: event.id,
    communityId: universe.communityId,
    title: event.title,
    description: event.description,
    startAt: event.startAt,
    location: event.location,
    tags: event.tags,
    createdAt: now(),
  }));

  const eventAttendees = [];
  const profileAgents = [];
  const interactionMemory = [];

  universe.events.forEach((event, eventIndex) => {
    event.participants.forEach(([personKey, relationStatus], participantIndex) => {
      const person = universe.people.find((item) => item.key === personKey);
      const attendeeId = `seed_attendee_${eventIndex + 1}_${participantIndex + 1}`;
      const agentId = `seed_agent_${eventIndex + 1}_${participantIndex + 1}`;

      eventAttendees.push({
        id: attendeeId,
        eventId: event.id,
        userId: person.userId,
        email: person.email,
        name: person.name,
        affiliation: person.affiliation,
        importedBio: person.bio,
        status: "claimed",
        relationStatus,
        createdAt: now(),
      });

      profileAgents.push({
        id: agentId,
        userId: person.userId,
        attendeeId,
        eventId: event.id,
        draftStatus: "claimed",
        bio: person.bio,
        interests: person.interests,
        goals: person.goals,
        lookingFor: person.lookingFor,
        preferences: person.preferences,
        memorySummary: `${person.name} is attending ${event.title} as part of a recurring community network.`,
        consentedMemory: true,
        createdAt: now(),
        updatedAt: now(),
      });
    });
  });

  interactionMemory.push({
    id: "seed_interaction_1",
    profileAgentId: "seed_agent_1_1",
    otherProfileAgentId: "seed_agent_1_2",
    eventId: "seed_event_founder_salon",
    summary: "Ada and Kwame already built rapport around real climate pilot deployment.",
    usefulnessScore: 5,
    followUpState: "warm",
    createdAt: now(),
  });

  return {
    meta: {
      version: 1,
      lastUpdatedAt: now(),
      seedUniverseV2: true,
    },
    communities: [
      {
        id: universe.communityId,
        name: "PAMOJA Demo Community",
        description: "Seed universe for local MVP testing with reusable template events and agent profiles.",
        createdAt: now(),
      },
    ],
    users,
    events,
    eventAttendees,
    profileAgents,
    eventAgents: universe.events.map((event, index) => ({
      id: `seed_event_agent_${index + 1}`,
      eventId: event.id,
      summary: `${event.title} exists to represent who has attended, is attending, and will attend this event.`,
      themes: event.tags,
      createdAt: now(),
      updatedAt: now(),
    })),
    profileMemory: [
      {
        id: "memory_ada_1",
        profileAgentId: "seed_agent_1_1",
        memoryType: "summary",
        content: "Ada gets the most value from operator-heavy intros tied to real pilots.",
        sourceEventId: "seed_event_founder_salon",
        createdAt: now(),
      },
    ],
    interactionMemory,
    recommendations: [],
    debriefs: [],
    analyticsEvents: [],
  };
}

function mergeSeedUniverse(db) {
  if (db.meta && db.meta.seedUniverseV2) {
    return false;
  }

  const seed = buildDemoData();
  const collections = [
    "communities",
    "users",
    "events",
    "eventAttendees",
    "profileAgents",
    "eventAgents",
    "profileMemory",
    "interactionMemory",
  ];

  collections.forEach((key) => {
    const existingIds = new Set((db[key] || []).map((item) => item.id));
    seed[key].forEach((item) => {
      if (!existingIds.has(item.id)) {
        db[key].push(item);
      }
    });
  });

  db.eventAttendees.forEach((row) => {
    if (!row.relationStatus) {
      row.relationStatus = "will_attend";
    }
  });

  db.eventAgents.forEach((eventAgent) => {
    if (!String(eventAgent.summary || "").includes("will attend")) {
      eventAgent.summary = "This Event Agent represents who has attended, is attending, or will attend the event.";
      eventAgent.updatedAt = now();
    }
  });

  db.meta = {
    ...(db.meta || {}),
    seedUniverseV2: true,
  };

  return true;
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(buildDemoData(), null, 2));
    return;
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  if (mergeSeedUniverse(db)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  db.meta = {
    ...(db.meta || {}),
    version: 1,
    lastUpdatedAt: now(),
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function updateDb(mutator) {
  const db = readDb();
  const result = mutator(db) || db;
  writeDb(result);
  return result;
}

function getEventSummary(db) {
  return db.events.map((event) => {
    const attendees = db.eventAttendees.filter((row) => row.eventId === event.id);
    const profiles = db.profileAgents.filter((agent) => agent.eventId === event.id);

    return {
      ...event,
      attendeeCount: attendees.length,
      claimedCount: profiles.filter((agent) => agent.draftStatus === "claimed").length,
    };
  });
}

function findEvent(db, eventId) {
  return db.events.find((event) => event.id === eventId);
}

function findProfileAgent(db, profileAgentId) {
  return db.profileAgents.find((agent) => agent.id === profileAgentId);
}

function createEvent(db, payload) {
  const communityName = String(payload.communityName || "PAMOJA Community").trim();
  let community = db.communities.find(
    (item) => item.name.toLowerCase() === communityName.toLowerCase()
  );

  if (!community) {
    community = {
      id: createId("community"),
      name: communityName,
      description: "",
      createdAt: now(),
    };
    db.communities.push(community);
  }

  const event = {
    id: createId("event"),
    communityId: community.id,
    title: String(payload.title || "").trim(),
    description: String(payload.description || "").trim(),
    startAt: payload.startAt || "",
    location: String(payload.location || "").trim(),
    tags: unique((payload.tags || []).map((tag) => String(tag).trim())),
    createdAt: now(),
  };

  db.events.push(event);
  db.eventAgents.push({
    id: createId("event_agent"),
    eventId: event.id,
    summary: event.description || `${event.title} represents who has attended, is attending, or will attend.`,
    themes: event.tags,
    createdAt: now(),
    updatedAt: now(),
  });

  return event;
}

function buildDraftProfile(row, attendeeId, userId, eventId) {
  const interests = listFromRow(row.interests, row.interest);
  const goals = listFromRow(row.goals, row.goal);
  const lookingFor = listFromRow(row.looking_for, row.lookingfor, row.looking);
  const preferences = listFromRow(row.preferences, row.preference);
  const bio = String(row.bio || row.description || "").trim();

  return {
    id: createId("agent"),
    userId,
    attendeeId,
    eventId,
    draftStatus: "draft",
    bio,
    interests,
    goals,
    lookingFor,
    preferences,
    memorySummary: bio ? `Imported from organizer roster: ${bio}` : "Awaiting attendee confirmation.",
    consentedMemory: false,
    createdAt: now(),
    updatedAt: now(),
  };
}

function upsertAttendees(db, eventId, rows) {
  const createdAgents = [];

  rows.forEach((row) => {
    const name = String(row.name || "").trim();
    if (!name) {
      return;
    }

    const email = String(row.email || "").trim().toLowerCase();
    const affiliation = String(row.affiliation || "").trim();
    let user = email
      ? db.users.find((item) => item.email && item.email.toLowerCase() === email)
      : null;

    if (!user) {
      user = {
        id: createId("user"),
        email,
        name,
        affiliation,
        createdAt: now(),
      };
      db.users.push(user);
    }

    const attendee = {
      id: createId("attendee"),
      eventId,
      userId: user.id,
      email,
      name,
      affiliation,
      importedBio: String(row.bio || "").trim(),
      status: "draft",
      relationStatus: "will_attend",
      createdAt: now(),
    };

    db.eventAttendees.push(attendee);
    const profile = buildDraftProfile(row, attendee.id, user.id, eventId);
    db.profileAgents.push(profile);
    createdAgents.push(profile);
  });

  const eventAgent = db.eventAgents.find((item) => item.eventId === eventId);
  const event = findEvent(db, eventId);

  if (eventAgent && event) {
    const bios = db.eventAttendees
      .filter((row) => row.eventId === eventId)
      .map((row) => row.importedBio)
      .filter(Boolean);

    eventAgent.summary = `${event.title} is focused on ${event.tags.join(", ") || "high-context networking"} and currently has ${db.eventAttendees.filter((row) => row.eventId === eventId).length} attendees.`;
    eventAgent.themes = unique([
      ...event.tags,
      ...bios.flatMap((bio) =>
        bio
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((token) => token.length > 6)
          .slice(0, 3)
      ),
    ]).slice(0, 8);
    eventAgent.updatedAt = now();
  }

  return createdAgents;
}

function claimProfileAgent(db, profileAgentId, payload) {
  const agent = findProfileAgent(db, profileAgentId);

  if (!agent) {
    return null;
  }

  const user = db.users.find((item) => item.id === agent.userId);
  const attendee = db.eventAttendees.find((item) => item.id === agent.attendeeId);

  if (user) {
    user.name = String(payload.name || user.name).trim();
    user.email = String(payload.email || user.email || "").trim();
    user.affiliation = String(payload.affiliation || user.affiliation || "").trim();
  }

  if (attendee) {
    attendee.name = user ? user.name : attendee.name;
    attendee.email = user ? user.email : attendee.email;
    attendee.affiliation = user ? user.affiliation : attendee.affiliation;
    attendee.status = "claimed";
    attendee.relationStatus = attendee.relationStatus || "attending";
  }

  agent.bio = String(payload.bio || agent.bio || "").trim();
  agent.interests = unique(payload.interests || agent.interests || []);
  agent.goals = unique(payload.goals || agent.goals || []);
  agent.lookingFor = unique(payload.lookingFor || agent.lookingFor || []);
  agent.preferences = unique(payload.preferences || agent.preferences || []);
  agent.consentedMemory = Boolean(payload.consentedMemory);
  agent.draftStatus = "claimed";
  agent.memorySummary = `${user ? user.name : "This attendee"} wants ${agent.goals[0] || "better introductions"} and is looking for ${agent.lookingFor[0] || "relevant collaborators"}.`;
  agent.updatedAt = now();

  db.profileMemory.push({
    id: createId("memory"),
    profileAgentId: agent.id,
    memoryType: "claim",
    content: `Claimed profile with goals: ${agent.goals.join(", ") || "n/a"}; looking for: ${agent.lookingFor.join(", ") || "n/a"}.`,
    sourceEventId: agent.eventId,
    createdAt: now(),
  });

  return agent;
}

module.exports = {
  DB_PATH,
  createId,
  createEvent,
  ensureDb,
  findEvent,
  findProfileAgent,
  getEventSummary,
  now,
  readDb,
  updateDb,
  upsertAttendees,
  claimProfileAgent,
};
