import { NextResponse } from "next/server";
import {
  getTelegramBotToken,
  getTelegramBotUsername,
  getTelegramWebhookInfo,
} from "../../../../lib/telegram";

export async function GET() {
  const username = getTelegramBotUsername();
  const enabled = Boolean(getTelegramBotToken() && username);
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const expectedWebhook = appBaseUrl ? `${appBaseUrl}/api/telegram/webhook` : "";
  const webhookInfo = enabled ? await getTelegramWebhookInfo() : null;

  return NextResponse.json({
    enabled,
    username,
    expectedWebhook,
    webhookInfo: webhookInfo?.result || null,
  });
}
