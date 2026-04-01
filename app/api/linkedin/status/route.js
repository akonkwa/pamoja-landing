import { NextResponse } from "next/server";
import { getLinkedInConfig, isLinkedInConfigured } from "../../../../lib/linkedin";

export async function GET() {
  const config = getLinkedInConfig();
  return NextResponse.json({
    officialApiConfigured: isLinkedInConfigured(),
    assistedImportAvailable: true,
    redirectUri: config.redirectUri,
    notes: [
      "Direct LinkedIn OAuth is now the primary official login path in this app.",
      "Tokens are stored locally in encrypted server-side storage.",
      "No raw credential scraping or background automation is implemented.",
    ],
  });
}
