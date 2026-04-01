import { NextResponse } from "next/server";
import {
  clearPendingOauthState,
  isLinkedInConfigured,
  persistLinkedInOauthConnection,
  validatePendingOauthState,
} from "../../../../../lib/linkedin";
import { logEvent } from "../../../../../lib/fs-store";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("error")) {
    return NextResponse.redirect(
      new URL(`/?linkedin_error=${encodeURIComponent(searchParams.get("error_description") || searchParams.get("error"))}`, request.url)
    );
  }
  if (!isLinkedInConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "LinkedIn OAuth is not configured for token exchange in this environment.",
      },
      { status: 400 }
    );
  }
  const state = searchParams.get("state");
  const code = searchParams.get("code");

  if (!validatePendingOauthState(state)) {
    logEvent("linkedin_direct_callback_failed", {
      reason: "state_mismatch",
      callbackHost: new URL(request.url).host,
    });
    return NextResponse.redirect(new URL("/?linkedin_error=State%20mismatch", request.url));
  }

  if (!code) {
    logEvent("linkedin_direct_callback_failed", {
      reason: "missing_code",
      callbackHost: new URL(request.url).host,
    });
    return NextResponse.redirect(new URL("/?linkedin_error=Missing%20authorization%20code", request.url));
  }

  try {
    await persistLinkedInOauthConnection(code);
    clearPendingOauthState();
    const response = NextResponse.redirect(new URL("/?linkedin_connected=1", request.url));
    return response;
  } catch (error) {
    logEvent("linkedin_direct_callback_failed", {
      reason: "token_exchange_or_profile_failure",
      callbackHost: new URL(request.url).host,
      message: error.message,
    });
    return NextResponse.redirect(
      new URL(`/?linkedin_error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
