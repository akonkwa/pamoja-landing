import { NextResponse } from "next/server";
import { setTelegramWebhook } from "../../../../lib/telegram";

export async function POST() {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  if (!appBaseUrl) {
    return NextResponse.json({ error: "APP_BASE_URL is not configured." }, { status: 400 });
  }

  const webhookUrl = `${appBaseUrl}/api/telegram/webhook`;

  try {
    const result = await setTelegramWebhook(webhookUrl);
    return NextResponse.json({
      ok: true,
      webhookUrl,
      telegram: result,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
