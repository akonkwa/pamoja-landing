import { NextResponse } from "next/server";
import store from "../../../../lib/store";
import { createId, now } from "../../../../lib/store";
import { generateReplyForProfile } from "../../../../lib/agent-runtime";
import pamojaService from "../../../../lib/pamoja-service";
import { callLanguageModelDetailed } from "../../../../lib/openai";
import {
  consumeTelegramLinkToken,
  findTelegramConnection,
  sendTelegramMessage,
} from "../../../../lib/telegram";

const { updateDbAsync } = store;
const { recommendationsAction, simulateAgentIterationAction } = pamojaService;

function normalizeText(value) {
  return String(value || "").trim();
}

function buildHelpReply(profileName, eventTitle) {
  return [
    `You are linked to ${profileName}${eventTitle ? ` at ${eventTitle}` : ""}.`,
    "Commands you can run:",
    "/help - show commands and example prompts",
    "/pair - pair only this agent to the strongest people in the current event",
    "/advance - advance one day and run background pairing across the whole event",
    "/status - summarize what your agent is focused on right now",
    "Example prompts you can send:",
    "- Who should I meet next?",
    "- What happened today?",
    "- What did my agent find?",
    "- Summarize my top matches.",
    "- What event should I focus on next?",
  ].join("\n");
}

function parseTelegramIntent(text) {
  const normalized = normalizeText(text).toLowerCase();

  if (!normalized || normalized === "/start") {
    return { type: "help" };
  }

  if (normalized === "/help" || normalized === "/commands" || normalized === "/prompts" || normalized === "help") {
    return { type: "help" };
  }

  if (normalized === "/pair" || normalized.includes("run pairing") || normalized.includes("pair me")) {
    return { type: "pair" };
  }

  if (normalized === "/advance" || normalized === "/advance_day" || normalized.includes("advance day")) {
    return { type: "advance" };
  }

  if (normalized === "/status") {
    return { type: "status" };
  }

  return { type: "chat" };
}

function parseTaggedIntent(text) {
  const line = String(text || "")
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.startsWith("INTENT:"));

  const intent = line ? line.replace("INTENT:", "").trim().toLowerCase() : "";
  if (["help", "pair", "advance", "status", "chat"].includes(intent)) {
    return intent;
  }
  return "chat";
}

async function routeTelegramIntentWithModel({
  text,
  profileName,
  eventTitle,
  provider,
}) {
  const result = await callLanguageModelDetailed({
    systemPrompt:
      "You are an intent router for a Telegram networking agent. Classify the user's message into exactly one action. Choose HELP if they want commands, capabilities, prompts, or examples. Choose PAIR if they want matches or pairings for the connected agent only. Choose ADVANCE if they want background work, a day advance, a sweep across the event, or all agents processed. Choose STATUS if they want a summary of focus, findings, or current state. Choose CHAT for everything else.",
    userPrompt: [
      "Return exactly one line in this format:",
      "INTENT: HELP or PAIR or ADVANCE or STATUS or CHAT",
      "",
      `Connected profile: ${profileName || "n/a"}`,
      `Current event: ${eventTitle || "n/a"}`,
      `Telegram message: ${text || ""}`,
    ].join("\n"),
    maxOutputTokens: 24,
    provider,
  });

  const mapped = {
    help: "help",
    pair: "pair",
    advance: "advance",
    status: "status",
    chat: "chat",
  };

  return {
    type: mapped[parseTaggedIntent(result.text)] || "chat",
    source: result.ok ? "llm" : "rules",
  };
}

export async function POST(request) {
  const update = await request.json();
  const message = update?.message;

  if (!message?.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  try {
    await updateDbAsync(async (db) => {
      db.telegramMessages = db.telegramMessages || [];

      if (message.text?.startsWith("/start ")) {
        const token = message.text.replace("/start ", "").trim();
        const link = consumeTelegramLinkToken(db, token, message.from || {});
        const profile = db.profileAgents.find((item) => item.id === link.profileAgentId);
        const user = profile ? db.users.find((item) => item.id === profile.userId) : null;

        db.telegramMessages.push({
          id: createId("telegram_message"),
          telegramUserId: String(message.from?.id || ""),
          profileAgentId: profile?.id || null,
          direction: "inbound",
          text: message.text,
          createdAt: now(),
        });

        await sendTelegramMessage(
          message.chat.id,
          `Connected. You are now linked to ${user?.name || "your Pamoja agent"}.\n\n${buildHelpReply(
            user?.name || "your Pamoja agent",
            db.events.find((item) => item.id === profile?.eventId)?.title || ""
          )}`
        );
        return db;
      }

      const connection = findTelegramConnection(db, message.from?.id);
      if (!connection) {
        await sendTelegramMessage(
          message.chat.id,
          "I don't know which Pamoja agent you belong to yet. Open Pamoja, select your profile agent, and use Connect Telegram first."
        );
        return db;
      }

      const profile = db.profileAgents.find((item) => item.id === connection.profileAgentId);
      if (!profile) {
        await sendTelegramMessage(
          message.chat.id,
          "Your linked profile agent could not be found. Please reconnect from the app."
        );
        return db;
      }

      db.telegramMessages.push({
        id: createId("telegram_message"),
        telegramUserId: String(message.from?.id || ""),
        profileAgentId: profile.id,
        direction: "inbound",
        text: message.text || "",
        createdAt: now(),
      });

      const user = db.users.find((item) => item.id === profile.userId);
      const event = db.events.find((item) => item.id === profile.eventId);
      let intent = parseTelegramIntent(message.text);
      if (intent.type === "chat") {
        intent = await routeTelegramIntentWithModel({
          text: message.text,
          profileName: user?.name || "",
          eventTitle: event?.title || "",
          provider: db.meta?.llmProvider,
        }).catch(() => intent);
      }
      let reply = "";

      if (intent.type === "help") {
        reply = buildHelpReply(user?.name || "your Pamoja agent", event?.title || "");
      } else if (intent.type === "pair") {
        const pairing = await recommendationsAction(db, {
          eventId: profile.eventId,
          profileAgentId: profile.id,
          query: "Telegram-triggered agent pairing",
        });
        reply = [
          `I just ran pairing for ${user?.name || "this agent"} inside ${event?.title || "the current event"}.`,
          pairing.narrative,
          `Top matches:\n${(pairing.recommendations || [])
            .map((item) => `#${item.rank} ${item.name} - ${item.reason}`)
            .join("\n")}`,
          "The web graph should pick this up as soon as the dashboard refreshes.",
        ].join("\n\n");
      } else if (intent.type === "advance") {
        const simulation = await simulateAgentIterationAction(db, {
          eventId: profile.eventId,
          profileAgentId: profile.id,
        });
        reply = [
          `I advanced the universe to Day ${simulation.digest?.iteration || db.meta?.simulationDay || 0}.`,
          simulation.digest?.summary || "Background work completed.",
          `Background sweep ran across ${simulation.sweepAgentCount || 0} agents in ${event?.title || "this event"}.`,
        ].join("\n\n");
      } else {
        const response = await generateReplyForProfile({
          db,
          profile,
          question:
            intent.type === "status"
              ? "What should I know right now about my focus, strongest matches, and event context?"
              : message.text || "What should I know right now?",
          memoryType: "telegram_chat",
          source: "telegram",
          provider: db.meta?.llmProvider,
        });
        reply = response.reply;
      }

      db.telegramMessages.push({
        id: createId("telegram_message"),
        telegramUserId: String(message.from?.id || ""),
        profileAgentId: profile.id,
        direction: "outbound",
        text: reply,
        createdAt: now(),
      });

      await sendTelegramMessage(message.chat.id, reply);
      return db;
    });
  } catch (error) {
    await sendTelegramMessage(
      message.chat.id,
      error.message === "Telegram link token expired." || error.message === "Telegram link token not found."
        ? "That Telegram connect code is no longer valid. Generate a new one from Pamoja."
        : "Something went wrong on the Pamoja side. Please try again in a moment."
    );
  }

  return NextResponse.json({ ok: true });
}
