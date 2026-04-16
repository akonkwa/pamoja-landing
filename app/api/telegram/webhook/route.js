import { NextResponse } from "next/server";
import store from "../../../../lib/store";
import { createId, now } from "../../../../lib/store";
import { generateReplyForProfile } from "../../../../lib/agent-runtime";
import {
  consumeTelegramLinkToken,
  findTelegramConnection,
  sendTelegramMessage,
} from "../../../../lib/telegram";

const { updateDbAsync } = store;

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
          `Connected. You are now linked to ${user?.name || "your Pamoja agent"}. Ask me who to meet next, what happened today, or what your agent found.`
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

      const { reply } = await generateReplyForProfile({
        db,
        profile,
        question: message.text || "What should I know right now?",
        memoryType: "telegram_chat",
        source: "telegram",
        provider: db.meta?.llmProvider,
      });

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
