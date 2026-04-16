const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { resolveProvider } = require("./openai");

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
  const communities = [
    ["community_builders", "Founder Builders", "Founder-heavy rooms around product building, technical ambition, and startup matching."],
    ["community_joiners", "Operators and Joiners", "Operator-first rooms for people looking to join or support early-stage startups."],
    ["community_explorers", "Social Explorers", "Lighter-touch community events for curious people, connectors, and exploratory conversations."],
  ].map(([id, name, description]) => ({ id, name, description }));

  const people = [
    ["a1", "Arjun Mehta", "MIT AI Venture Studio", "AI infra builder focused on multi-agent systems and developer tooling", ["AI infra", "agents", "systems"], ["find technical cofounder"], ["backend engineers", "infra builders"], ["strong coding ability", "fast execution", "no purely academic profiles"], "A", "builder"],
    ["a2", "Lina Park", "Climate Tech Lab", "Founder building climate data platform for enterprise decisions", ["climate", "data", "sustainability"], ["find mission-aligned cofounder"], ["engineers with climate interest"], ["must care about impact", "long-term commitment"], "A", "builder"],
    ["a3", "Daniel Cohen", "Startup Studio", "Fintech builder optimizing payment infrastructure", ["fintech", "systems", "scale"], ["build fast and launch MVP"], ["scrappy builders"], ["speed over perfection", "high responsiveness"], "A", "builder"],
    ["a4", "Sofia Ramirez", "Creator Economy Lab", "Building consumer social platform for Gen Z communities", ["social apps", "behavior", "design"], ["find creative cofounder"], ["designers", "product thinkers"], ["creative mindset", "experimental"], "A", "builder"],
    ["a5", "Wei Zhang", "Deep Tech Group", "ML systems builder focused on model optimization", ["ML", "infra", "optimization"], ["build technically strong product"], ["ML engineers"], ["deep technical expertise only"], "A", "builder"],
    ["a6", "Marcus Johnson", "Marketplace Lab", "Founder building B2B marketplace for logistics", ["marketplaces", "ops", "growth"], ["scale supply and demand"], ["hustlers", "operators"], ["execution-focused", "sales ability"], "A", "builder"],
    ["a7", "Priya Nair", "HealthTech Studio", "Building digital health coordination platform", ["healthcare", "systems"], ["find domain + technical partner"], ["healthcare builders"], ["domain experience required"], "A", "builder"],
    ["a8", "Tom Becker", "EdTech Lab", "Founder building learning platform for upskilling", ["education", "AI", "access"], ["scale impact"], ["builders with education interest"], ["mission-driven", "collaborative"], "A", "builder"],
    ["a9", "Ethan Brooks", "Dev Tools Collective", "Building developer productivity tools", ["dev tools", "infra"], ["launch product fast"], ["engineers only"], ["technical depth", "no generalists"], "A", "builder"],
    ["a10", "Maya Singh", "Startup Studio", "Early-stage founder exploring product direction", ["startups", "AI", "growth"], ["find cofounder or early team"], ["builders", "operators"], ["open to different roles", "flexible"], "A", "edge"],
    ["b1", "Alex Chen", "MIT Sloan", "Ex-consultant focused on operations and scaling", ["ops", "strategy"], ["join early-stage startup"], ["founders"], ["structured environment", "clear roadmap"], "B", "operator"],
    ["b2", "Rachel Kim", "Product Lab", "Product manager with strong user focus", ["product", "UX"], ["build meaningful products"], ["product teams"], ["thoughtful decision-making"], "B", "operator"],
    ["b3", "Jordan Lee", "Growth Team", "Growth operator focused on metrics and acquisition", ["growth", "analytics"], ["scale user base"], ["startups with traction"], ["data-driven teams"], "B", "operator"],
    ["b4", "Kevin Patel", "BizOps Network", "Generalist operator across functions", ["operations", "execution"], ["support scaling startups"], ["founders"], ["flexible but structured"], "B", "operator"],
    ["b5", "Emily Wong", "Strategy Group", "Finance and strategy professional", ["finance", "planning"], ["join stable startup"], ["structured teams"], ["risk-aware environments"], "B", "operator"],
    ["b6", "Luis Garcia", "Supply Chain Lab", "Operations specialist in logistics", ["supply chain", "systems"], ["optimize operations"], ["operational roles"], ["efficiency-focused"], "B", "operator"],
    ["b7", "Sarah Ahmed", "Health Systems", "Healthcare operator with hospital experience", ["healthcare", "systems"], ["improve healthcare delivery"], ["health startups"], ["domain relevance"], "B", "operator"],
    ["b8", "Noah Davis", "Marketing Collective", "Marketing operator focused on brand and growth", ["marketing", "storytelling"], ["grow brand presence"], ["consumer startups"], ["creative + structured balance"], "B", "operator"],
    ["b9", "Olivia Brown", "Startup Network", "Early employee generalist", ["startups", "growth"], ["join founding team"], ["flexible roles"], ["learning opportunities"], "B", "operator"],
    ["b10", "Ben Carter", "MIT Sloan", "Operator transitioning into founder role", ["startups", "product"], ["start company"], ["cofounders"], ["slightly more aligned with builders"], "B", "edge"],
    ["c1", "Jason Liu", "MIT", "Interested in AI and startups, exploring options", ["AI", "startups"], ["learn and meet people"], ["interesting conversations"], ["open-ended"], "C", "explorer"],
    ["c2", "Chloe Martin", "Community Org", "Community builder organizing events", ["people", "events"], ["connect others"], ["diverse people"], ["warm interactions"], "C", "explorer"],
    ["c3", "Ryan Scott", "Student", "Exploring career paths", ["business", "tech"], ["learn"], ["guidance"], ["low pressure"], "C", "explorer"],
    ["c4", "Anna Fischer", "Generalist Network", "Curious generalist across industries", ["many topics"], ["explore ideas"], ["conversations"], ["flexible"], "C", "explorer"],
    ["c5", "David Kim", "Social Club", "Enjoys meeting new people", ["social", "lifestyle"], ["expand network"], ["anyone"], ["casual"], "C", "explorer"],
    ["c6", "Isabella Rossi", "Creative Collective", "Creative thinker interested in culture", ["art", "ideas"], ["exchange ideas"], ["thinkers"], ["expressive people"], "C", "explorer"],
    ["c7", "Ahmed Hassan", "Climate Community", "Interested in climate but not building yet", ["climate", "policy"], ["learn more"], ["discussions"], ["low commitment"], "C", "explorer"],
    ["c8", "Sophie Turner", "Social Network", "Enjoys conversations and meeting people", ["lifestyle", "people"], ["connect"], ["friendly people"], ["easygoing"], "C", "explorer"],
    ["c9", "Mark Wilson", "Open Network", "Broad interests across many domains", ["everything"], ["explore"], ["anyone"], ["no strict filters"], "C", "explorer"],
    ["c10", "Nina Patel", "Student Group", "Slightly more serious explorer considering startups", ["startups", "product"], ["learn and maybe join"], ["operators or teams"], ["somewhat structured"], "C", "edge"],
  ].map(([key, name, affiliation, bio, interests, goals, lookingFor, preferences, cluster, archetype]) => ({
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
    cluster,
    archetype,
  }));

  const fullUniverseParticipants = [
    ["a1", "attending"], ["a2", "attending"], ["a3", "attending"], ["a4", "attending"], ["a5", "attending"],
    ["a6", "attending"], ["a7", "attending"], ["a8", "attending"], ["a9", "attending"], ["a10", "attending"],
    ["b1", "will_attend"], ["b2", "will_attend"], ["b3", "will_attend"], ["b4", "will_attend"], ["b5", "will_attend"],
    ["b6", "will_attend"], ["b7", "will_attend"], ["b8", "will_attend"], ["b9", "will_attend"], ["b10", "will_attend"],
    ["c1", "has_attended"], ["c2", "has_attended"], ["c3", "has_attended"], ["c4", "has_attended"], ["c5", "has_attended"],
    ["c6", "has_attended"], ["c7", "has_attended"], ["c8", "has_attended"], ["c9", "has_attended"], ["c10", "has_attended"],
  ];

  const events = [
    {
      id: "seed_event_pamoja_universe_preview",
      title: "PAMOJA Universe Preview",
      description: "A full-universe event agent that lets you see all 30 seeded people together through has attended, is attending, and will attend relationships.",
      startAt: "2026-04-16T22:30:00.000Z",
      location: "Cambridge, MA",
      tags: ["universe", "preview", "network"],
      participants: fullUniverseParticipants,
    },
    {
      id: "seed_event_founder_builder_night",
      title: "Founder Builder Night",
      description: "Event Agent represents who has attended, is attending, and will attend a founder-heavy cofounder room.",
      startAt: "2026-04-18T23:00:00.000Z",
      location: "Cambridge, MA",
      tags: ["founders", "cofounders", "builders"],
      participants: [["a1", "attending"], ["a2", "attending"], ["a3", "attending"], ["a4", "attending"], ["a5", "will_attend"], ["a6", "will_attend"], ["a10", "will_attend"], ["b10", "will_attend"], ["c10", "will_attend"]],
    },
    {
      id: "seed_event_operator_match",
      title: "Operator Match Forum",
      description: "Event Agent represents attendance relationships between founders looking for joiners and operators looking for teams.",
      startAt: "2026-04-24T22:30:00.000Z",
      location: "Boston, MA",
      tags: ["operators", "founders", "matching"],
      participants: [["a6", "has_attended"], ["a7", "attending"], ["a8", "attending"], ["a10", "attending"], ["b1", "attending"], ["b2", "attending"], ["b3", "attending"], ["b4", "attending"], ["b9", "will_attend"], ["b10", "will_attend"], ["c10", "will_attend"]],
    },
    {
      id: "seed_event_social_explorer_mixer",
      title: "Social Explorer Mixer",
      description: "Event Agent represents who has attended, is attending, and will attend a looser exploratory social room.",
      startAt: "2026-05-01T23:30:00.000Z",
      location: "Somerville, MA",
      tags: ["social", "exploration", "community"],
      participants: [["c1", "attending"], ["c2", "attending"], ["c3", "attending"], ["c4", "attending"], ["c5", "attending"], ["c6", "will_attend"], ["c7", "will_attend"], ["c8", "will_attend"], ["c9", "will_attend"], ["c10", "will_attend"], ["b8", "will_attend"]],
    },
    {
      id: "seed_event_health_systems_roundtable",
      title: "Health Systems Roundtable",
      description: "Event Agent represents attendance ties among health founders, operators, and healthcare-curious collaborators.",
      startAt: "2026-05-08T22:00:00.000Z",
      location: "New York, NY",
      tags: ["health", "systems", "operators"],
      participants: [["a7", "attending"], ["b7", "attending"], ["a1", "will_attend"], ["a5", "will_attend"], ["b2", "will_attend"], ["c3", "will_attend"], ["c7", "will_attend"]],
    },
    {
      id: "seed_event_consumer_product_salon",
      title: "Consumer Product Salon",
      description: "Event Agent represents attendance relationships for social, product, design, and growth conversations.",
      startAt: "2026-05-15T23:00:00.000Z",
      location: "Brooklyn, NY",
      tags: ["consumer", "product", "growth"],
      participants: [["a4", "attending"], ["a10", "attending"], ["b2", "attending"], ["b3", "attending"], ["b8", "will_attend"], ["b9", "will_attend"], ["c2", "will_attend"], ["c6", "will_attend"], ["c8", "will_attend"], ["c10", "will_attend"]],
    },
    {
      id: "seed_event_fintech_scale_breakfast",
      title: "Fintech and Scale Breakfast",
      description: "Event Agent represents attendance ties around fintech, infra, speed, and scaling teams.",
      startAt: "2026-05-21T12:30:00.000Z",
      location: "New York, NY",
      tags: ["fintech", "infra", "scale"],
      participants: [["a3", "attending"], ["a9", "attending"], ["b5", "attending"], ["b4", "will_attend"], ["b10", "will_attend"], ["c1", "will_attend"], ["c9", "will_attend"]],
    },
  ];

  return {
    communities,
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

  const events = universe.events.map((event, index) => ({
    id: event.id,
    communityId: universe.communities[index % universe.communities.length].id,
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
      seedUniverseV4: true,
      simulationDay: 0,
      llmProvider: resolveProvider("openai") || resolveProvider("openrouter") || null,
    },
    communities: universe.communities.map((community) => ({
      ...community,
      createdAt: now(),
    })),
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
    agentDigests: [],
    recommendations: [],
    debriefs: [],
    analyticsEvents: [],
    telegramConnections: [],
    telegramLinkTokens: [],
    telegramMessages: [],
  };
}

function resetDb() {
  ensureDb();
  const next = buildDemoData();
  writeDb(next);
  return next;
}

function mergeSeedUniverse(db) {
  let changed = false;

  if (!Array.isArray(db.agentDigests)) {
    db.agentDigests = [];
    changed = true;
  }

  if (!Array.isArray(db.telegramConnections)) {
    db.telegramConnections = [];
    changed = true;
  }

  if (!Array.isArray(db.telegramLinkTokens)) {
    db.telegramLinkTokens = [];
    changed = true;
  }

  if (!Array.isArray(db.telegramMessages)) {
    db.telegramMessages = [];
    changed = true;
  }

  if (!db.meta || typeof db.meta.simulationDay !== "number") {
    db.meta = {
      ...(db.meta || {}),
      simulationDay: 0,
    };
    changed = true;
  }

  if (!db.meta || !("llmProvider" in db.meta)) {
    db.meta = {
      ...(db.meta || {}),
      llmProvider: resolveProvider("openai") || resolveProvider("openrouter") || null,
    };
    changed = true;
  }

  if (db.meta && db.meta.seedUniverseV4) {
    return changed;
  }

  const seed = buildDemoData();
  const replaceCollections = [
    "communities",
    "users",
    "events",
    "eventAttendees",
    "profileAgents",
    "eventAgents",
    "profileMemory",
    "interactionMemory",
    "agentDigests",
    "recommendations",
  ];

  const seededIdPatterns = [
    /^community_(builders|joiners|explorers)$/,
    /^seed_/,
  ];

  replaceCollections.forEach((key) => {
    const incomingIds = new Set((seed[key] || []).map((item) => String(item.id || "")));
    db[key] = (db[key] || []).filter((item) => {
      const id = String(item.id || "");
      return !incomingIds.has(id) && !seededIdPatterns.some((pattern) => pattern.test(id));
    });

    db[key].push(...seed[key]);
    changed = true;
  });

  db.eventAttendees.forEach((row) => {
    if (!row.relationStatus) {
      row.relationStatus = "will_attend";
      changed = true;
    }
  });

  db.eventAgents.forEach((eventAgent) => {
    if (!String(eventAgent.summary || "").includes("will attend")) {
      eventAgent.summary = "This Event Agent represents who has attended, is attending, or will attend the event.";
      eventAgent.updatedAt = now();
      changed = true;
    }
  });

  db.meta = {
    ...(db.meta || {}),
      seedUniverseV4: true,
    };
  changed = true;

  return changed;
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

async function updateDbAsync(mutator) {
  const db = readDb();
  const result = (await mutator(db)) || db;
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
  const communityName = String(payload.communityName || "UMOJA Community").trim();
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

function refreshEventAgent(db, eventId) {
  const eventAgent = db.eventAgents.find((item) => item.eventId === eventId);
  const event = findEvent(db, eventId);

  if (!eventAgent || !event) {
    return;
  }

  const attendeeRows = db.eventAttendees.filter((row) => row.eventId === eventId);
  const bios = attendeeRows.map((row) => row.importedBio).filter(Boolean);

  eventAgent.summary = `${event.title} is focused on ${event.tags.join(", ") || "high-context networking"} and currently has ${attendeeRows.length} attendees.`;
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

  refreshEventAgent(db, eventId);

  return createdAgents;
}

function createProfileAgent(db, payload) {
  const event = findEvent(db, payload.eventId);

  if (!event) {
    throw new Error("Event not found.");
  }

  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Profile name is required.");
  }

  const email = String(payload.email || "").trim().toLowerCase();
  const affiliation = String(payload.affiliation || "").trim();
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
  } else {
    user.name = name || user.name;
    user.email = email || user.email;
    user.affiliation = affiliation || user.affiliation;
  }

  const attendee = {
    id: createId("attendee"),
    eventId: event.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    affiliation: user.affiliation,
    importedBio: String(payload.bio || "").trim(),
    status: "claimed",
    relationStatus: String(payload.relationStatus || "attending").trim() || "attending",
    createdAt: now(),
  };
  db.eventAttendees.push(attendee);

  const interests = listFromRow(payload.interests);
  const goals = listFromRow(payload.goals);
  const lookingFor = listFromRow(payload.lookingFor);
  const preferences = listFromRow(payload.preferences);

  const profileAgent = {
    id: createId("agent"),
    userId: user.id,
    attendeeId: attendee.id,
    eventId: event.id,
    draftStatus: "claimed",
    bio: String(payload.bio || "").trim(),
    interests,
    goals,
    lookingFor,
    preferences,
    memorySummary: `${user.name} is entering ${event.title} looking for ${lookingFor[0] || "strong matches"}.`,
    consentedMemory: Boolean(payload.consentedMemory),
    createdAt: now(),
    updatedAt: now(),
  };
  db.profileAgents.push(profileAgent);

  db.profileMemory.push({
    id: createId("memory"),
    profileAgentId: profileAgent.id,
    memoryType: "create",
    content: `Created profile agent for ${event.title}. Goals: ${goals.join(", ") || "n/a"}.`,
    sourceEventId: event.id,
    createdAt: now(),
  });

  refreshEventAgent(db, event.id);
  return profileAgent;
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
  createProfileAgent,
  ensureDb,
  findEvent,
  findProfileAgent,
  getEventSummary,
  now,
  readDb,
  resetDb,
  updateDb,
  updateDbAsync,
  upsertAttendees,
  claimProfileAgent,
};
