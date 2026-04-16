const { createId, now } = require("./store");
const { generateAgentReply } = require("./pamoja-narrative");

function buildFallbackReply(profile, latestDigest, event) {
  return `I am focusing on ${profile.goals?.[0] || "finding the right people"} and right now I would prioritize ${latestDigest?.people?.[0]?.name || "the strongest match from my latest scan"} while keeping an eye on ${latestDigest?.events?.[0]?.title || event?.title || "the most relevant event"}.`;
}

async function generateReplyForProfile({
  db,
  profile,
  question,
  memoryType = "agent_chat",
  source = "web",
  provider,
}) {
  const user = db.users.find((item) => item.id === profile.userId);
  const event = db.events.find((item) => item.id === profile.eventId);
  const latestDigest = (db.agentDigests || [])
    .filter((item) => item.profileAgentId === profile.id)
    .slice()
    .sort((left, right) => right.iteration - left.iteration)[0];
  const latestDebrief = (db.debriefs || [])
    .filter((item) => item.profileAgentId === profile.id)
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];

  const fallbackReply = buildFallbackReply(profile, latestDigest, event);
  const reply = await generateAgentReply({
    agentName: user?.name || "This agent",
    affiliation: user?.affiliation || "",
    bio: profile.bio,
    goals: profile.goals,
    lookingFor: profile.lookingFor,
    latestDigest,
    latestDebrief,
    selectedEvent: event,
    question,
    fallbackReply,
    provider,
  });

  db.profileMemory.push({
    id: createId("memory"),
    profileAgentId: profile.id,
    memoryType,
    content: `Q: ${question} A: ${reply}`,
    sourceEventId: profile.eventId,
    createdAt: now(),
  });

  return {
    reply,
    user,
    event,
    latestDigest,
    latestDebrief,
    source,
  };
}

module.exports = {
  generateReplyForProfile,
};
