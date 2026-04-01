import { auth0, isAuth0Configured } from "./auth0-client";
import { logEvent, readLinkedInConnection, writeVaultSnapshot } from "./fs-store";
import { authResponsePayload, validateSession } from "./session";

export async function getAuthState(request) {
  const localSession = validateSession(request);
  if (localSession) {
    return {
      authenticated: true,
      provider: "local",
      username: localSession.username,
      user: {
        name: localSession.username,
        email: null,
      },
      auth0Configured: isAuth0Configured(),
    };
  }

  if (isAuth0Configured() && auth0) {
    const auth0Session = await auth0.getSession(request);
    if (auth0Session?.user) {
      return {
        authenticated: true,
        provider: "auth0",
        username: auth0Session.user.name || auth0Session.user.nickname || auth0Session.user.email,
        user: auth0Session.user,
        auth0Configured: true,
      };
    }
  }

  return {
    ...authResponsePayload(),
    authenticated: false,
    provider: null,
    user: null,
    auth0Configured: isAuth0Configured(),
  };
}

export async function requireAuth(request) {
  const state = await getAuthState(request);
  return state.authenticated ? state : null;
}

export async function getLinkedInConnectionState(request) {
  const directConnection = readLinkedInConnection();
  if (directConnection?.connected) {
    const snapshot = {
      connected: true,
      provider: "linkedin-direct",
      auth0Configured: isAuth0Configured(),
      profile: directConnection.profile,
      token: {
        present: Boolean(directConnection.token?.accessToken),
        expiresAt: directConnection.token?.expiresAt || null,
        scope: directConnection.token?.scope || null,
      },
      tokenError: null,
    };
    logEvent("linkedin_profile_checked", {
      connected: true,
      provider: "linkedin-direct",
      hasEmail: Boolean(directConnection.profile?.email),
      tokenPresent: Boolean(directConnection.token?.accessToken),
    });
    return snapshot;
  }

  const authState = await getAuthState(request);
  if (!authState.authenticated || authState.provider !== "auth0" || !auth0) {
    return {
      connected: false,
      provider: authState.provider || null,
      auth0Configured: isAuth0Configured(),
      profile: null,
      token: null,
    };
  }

  let token = null;
  let tokenError = null;
  try {
    const tokenSet = await auth0.getAccessTokenForConnection(
      {
        connection: process.env.AUTH0_LINKEDIN_CONNECTION || "linkedin",
      },
      request
    );
    token = {
      expiresAt: tokenSet.expiresAt,
      present: Boolean(tokenSet.token),
    };
  } catch (error) {
    tokenError = error.message;
  }

  const snapshot = {
    connected: true,
    provider: "auth0",
    auth0Configured: true,
    profile: authState.user,
    token,
    tokenError,
  };
  writeVaultSnapshot("linkedin-profile", {
    capturedAt: new Date().toISOString(),
    ...snapshot,
  });
  logEvent("linkedin_profile_checked", {
    connected: true,
    hasEmail: Boolean(authState.user?.email),
    tokenPresent: Boolean(token?.present),
    tokenError: tokenError || null,
  });
  return snapshot;
}
