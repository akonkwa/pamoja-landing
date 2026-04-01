import { NextResponse } from "next/server";
import {
  buildLinkedInAuthUrl,
  createOauthState,
  getLinkedInConfig,
  isLinkedInConfigured,
  persistPendingOauthState,
} from "../../../../../lib/linkedin";

export async function GET() {
  if (!isLinkedInConfigured()) {
    return NextResponse.json(
      {
        error: "Direct LinkedIn OAuth is not configured in this local environment yet.",
        requiredEnv: [
          "LINKEDIN_CLIENT_ID",
          "LINKEDIN_CLIENT_SECRET",
          "LINKEDIN_REDIRECT_URI",
        ],
        auth0Dashboard: [
          "Create or use a LinkedIn developer app.",
          "Set the LinkedIn redirect URL to your local callback route.",
          "Paste the LinkedIn client ID and client secret into .env.local.",
        ],
      },
      { status: 400 }
    );
  }

  const oauthState = createOauthState();
  persistPendingOauthState(oauthState);
  return NextResponse.json({
    ok: true,
    authUrl: buildLinkedInAuthUrl(oauthState),
    redirectUri: getLinkedInConfig().redirectUri,
  });
}
