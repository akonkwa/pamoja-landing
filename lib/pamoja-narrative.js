const { callLanguageModel, callLanguageModelDetailed } = require("./openai");

function cleanLine(text) {
  return String(text || "").replace(/^\s*[-*]\s*/, "").trim();
}

function parseTaggedLines(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const values = {};
  lines.forEach((line) => {
    const match = line.match(/^([A-Z0-9_]+)\s*:\s*(.+)$/);
    if (match) {
      values[match[1]] = cleanLine(match[2]);
    }
  });
  return values;
}

function buildProviderUnavailableReply(prefix, fallbackReply, failureMessage) {
  const details = String(failureMessage || "").trim() || "Both configured model providers are unavailable right now.";
  return `${prefix} ${details}${fallbackReply ? ` For now, the best local fallback is: ${fallbackReply}` : ""}`.trim();
}

async function generatePairingNarrative({
  requesterName,
  requesterBio,
  eventTitle,
  eventTags,
  recommendations,
  fallbackNarrative,
  provider,
}) {
  const text = await callLanguageModel({
    systemPrompt:
      "You turn matchmaking data into concise, human-readable networking advice. Be warm, specific, and concrete. Do not mention scoring algorithms.",
    userPrompt: [
      "Return exactly one line in this format:",
      "NARRATIVE: ...",
      "",
      `Requester: ${requesterName}`,
      `Bio: ${requesterBio || "n/a"}`,
      `Event: ${eventTitle}`,
      `Event tags: ${(eventTags || []).join(", ") || "n/a"}`,
      `Top matches: ${(recommendations || [])
        .map((item) => `${item.name} (${item.affiliation}) because ${item.reason}`)
        .join(" | ")}`,
    ].join("\n"),
    maxOutputTokens: 180,
    provider,
  });

  const parsed = parseTaggedLines(text);
  return parsed.NARRATIVE || fallbackNarrative;
}

async function generateDigestNarrative({
  requesterName,
  modeLabel,
  day,
  people,
  events,
  communities,
  fallbackSummary,
  fallbackActions,
  provider,
}) {
  const text = await callLanguageModel({
    systemPrompt:
      "You write daily autonomous agent digests. Be vivid but concise, human-readable, and useful. Keep it demo-friendly and grounded in the provided data.",
    userPrompt: [
      "Return exactly three lines in this format:",
      "SUMMARY: ...",
      "ACTION1: ...",
      "ACTION2: ...",
      "",
      `Agent: ${requesterName}`,
      `Day: ${day}`,
      `Mode: ${modeLabel}`,
      `People found: ${(people || []).map((item) => `${item.name} (${item.reason})`).join(" | ") || "none"}`,
      `Events found: ${(events || []).map((item) => item.title).join(" | ") || "none"}`,
      `Communities explored: ${(communities || []).map((item) => item.name).join(" | ") || "none"}`,
    ].join("\n"),
    maxOutputTokens: 220,
    provider,
  });

  const parsed = parseTaggedLines(text);
  return {
    summary: parsed.SUMMARY || fallbackSummary,
    actions: [parsed.ACTION1, parsed.ACTION2].filter(Boolean).length
      ? [parsed.ACTION1, parsed.ACTION2].filter(Boolean)
      : fallbackActions,
  };
}

async function generateAgentReply({
  agentName,
  affiliation,
  bio,
  goals,
  lookingFor,
  latestDigest,
  latestDebrief,
  selectedEvent,
  question,
  fallbackReply,
  provider,
}) {
  const result = await callLanguageModelDetailed({
    systemPrompt:
      "You are speaking as a networking agent on behalf of a real profile. Answer in first person, be concise, practical, and human. Mention concrete people, events, and next moves when available.",
    userPrompt: [
      "Return exactly one line in this format:",
      "REPLY: ...",
      "",
      `Agent name: ${agentName}`,
      `Affiliation: ${affiliation || "n/a"}`,
      `Bio: ${bio || "n/a"}`,
      `Goals: ${(goals || []).join(", ") || "n/a"}`,
      `Looking for: ${(lookingFor || []).join(", ") || "n/a"}`,
      `Selected event: ${selectedEvent?.title || "n/a"}`,
      `Latest digest: ${latestDigest?.summary || "n/a"}`,
      `Latest debrief: ${latestDebrief?.notes || "n/a"}`,
      `User question: ${question}`,
    ].join("\n"),
    maxOutputTokens: 220,
    provider,
  });

  if (!result.ok || !result.text) {
    return {
      reply: buildProviderUnavailableReply(
        "I could not answer as a live AI agent because the model providers were unavailable.",
        fallbackReply,
        result.failureMessage
      ),
      source: "fallback",
      confidence: "low",
      provider: null,
      attempts: result.attempts || [],
      failedOver: Boolean(result.failoverUsed),
    };
  }

  const parsed = parseTaggedLines(result.text);
  return {
    reply: parsed.REPLY || fallbackReply,
    source: parsed.REPLY ? "llm" : "fallback",
    confidence: parsed.REPLY ? "high" : "low",
    provider: result.provider,
    attempts: result.attempts || [],
    failedOver: Boolean(result.failoverUsed),
  };
}

async function generateAgenticUniverseReply({
  personaName,
  personaMode,
  affiliation,
  bio,
  goals,
  lookingFor,
  selectedEvent,
  question,
  toolContext,
  fallbackReply,
  provider,
}) {
  const result = await callLanguageModelDetailed({
    systemPrompt:
      "You are an agentic universe guide for a networking app. Answer the user's question using the retrieved tool results only. Be concrete, concise, and transparent about uncertainty. If speaking as a profile, answer in first person. If speaking as a universe guide, answer in first person plural using 'I can see'.",
    userPrompt: [
      "Return exactly two lines in this format:",
      "REPLY: ...",
      "CONFIDENCE: high|medium|low",
      "",
      `Persona mode: ${personaMode}`,
      `Persona name: ${personaName}`,
      `Affiliation: ${affiliation || "n/a"}`,
      `Bio: ${bio || "n/a"}`,
      `Goals: ${(goals || []).join(", ") || "n/a"}`,
      `Looking for: ${(lookingFor || []).join(", ") || "n/a"}`,
      `Selected event: ${selectedEvent?.title || "n/a"}`,
      `User question: ${question}`,
      "",
      "Retrieved tool context:",
      toolContext || "No live tool context was available.",
    ].join("\n"),
    maxOutputTokens: 320,
    provider,
  });

  if (!result.ok || !result.text) {
    return {
      reply: buildProviderUnavailableReply(
        "I could not answer from a live model because the AI providers were unavailable.",
        fallbackReply,
        result.failureMessage
      ),
      source: "fallback",
      confidence: "low",
      provider: null,
      attempts: result.attempts || [],
      failedOver: Boolean(result.failoverUsed),
    };
  }

  const parsed = parseTaggedLines(result.text);
  return {
    reply: parsed.REPLY || fallbackReply,
    source: parsed.REPLY ? "llm" : "fallback",
    confidence: parsed.CONFIDENCE || (parsed.REPLY ? "medium" : "low"),
    provider: result.provider,
    attempts: result.attempts || [],
    failedOver: Boolean(result.failoverUsed),
  };
}

async function detectAgentCreationIntent({
  prompt,
  selectedEventTitle,
  fallbackName,
  provider,
}) {
  const text = await callLanguageModel({
    systemPrompt:
      "You extract structured profile-agent creation requests. Detect when the user is asking the app to create a new profile agent from natural language. Be conservative and only say CREATE when the request is actually about creating a profile agent.",
    userPrompt: [
      "Return exactly these lines:",
      "INTENT: CREATE or CHAT",
      "NAME: ...",
      "AFFILIATION: ...",
      "BIO: ...",
      "GOALS: item1; item2",
      "INTERESTS: item1; item2",
      "LOOKING_FOR: item1; item2",
      "PREFERENCES: item1; item2",
      "EMAIL: ...",
      "",
      `Selected event: ${selectedEventTitle || "n/a"}`,
      `Fallback name: ${fallbackName || "n/a"}`,
      `User prompt: ${prompt}`,
    ].join("\n"),
    maxOutputTokens: 220,
    provider,
  });

  return parseTaggedLines(text);
}

module.exports = {
  detectAgentCreationIntent,
  generateAgenticUniverseReply,
  generateDigestNarrative,
  generateAgentReply,
  generatePairingNarrative,
};
