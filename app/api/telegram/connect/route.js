import { NextResponse } from "next/server";
import store from "../../../../lib/store";
import { createTelegramLinkToken, getTelegramBotUsername } from "../../../../lib/telegram";

const { updateDb } = store;

export async function POST(request) {
  const body = await request.json();
  let payload;

  try {
    updateDb((db) => {
      const profile = db.profileAgents.find((item) => item.id === body.profileAgentId);
      if (!profile) {
        throw new Error("Profile Agent not found.");
      }

      const token = createTelegramLinkToken(db, profile.id);
      const botUsername = getTelegramBotUsername();
      payload = {
        token: token.token,
        expiresAt: token.expiresAt,
        botUsername,
        deepLink: botUsername ? `https://t.me/${botUsername}?start=${token.token}` : "",
      };
      return db;
    });
  } catch (error) {
    const status = error.message === "Profile Agent not found." ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(payload, { status: 201 });
}
