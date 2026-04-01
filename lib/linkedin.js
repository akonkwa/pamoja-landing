const crypto = require("crypto");
const {
  clearLinkedInOauthState,
  logEvent,
  readLinkedInConnection,
  readLinkedInOauthState,
  writeLinkedInConnection,
  writeLinkedInOauthState,
  writeVaultSnapshot,
} = require("./fs-store");

function getLinkedInConfig() {
  return {
    clientId: process.env.LINKEDIN_CLIENT_ID || "",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
    redirectUri:
      process.env.LINKEDIN_REDIRECT_URI || "http://127.0.0.1:3000/api/linkedin/official/callback",
    scope: process.env.LINKEDIN_SCOPE || "openid profile email",
  };
}

function isLinkedInConfigured() {
  const config = getLinkedInConfig();
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

function createOauthState() {
  return crypto.randomBytes(18).toString("hex");
}

function persistPendingOauthState(state) {
  writeLinkedInOauthState({
    state,
    createdAt: Date.now(),
  });
}

function validatePendingOauthState(state) {
  const pending = readLinkedInOauthState();
  if (!pending?.state || !state) {
    return false;
  }
  const freshEnough = Date.now() - Number(pending.createdAt || 0) < 10 * 60 * 1000;
  return freshEnough && pending.state === state;
}

function clearPendingOauthState() {
  clearLinkedInOauthState();
}

function buildLinkedInAuthUrl(state) {
  const config = getLinkedInConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

async function exchangeLinkedInCodeForToken(code) {
  const config = getLinkedInConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "LinkedIn token exchange failed");
  }
  return data;
}

async function fetchLinkedInUserInfo(accessToken) {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "LinkedIn userinfo request failed");
  }
  return data;
}

async function persistLinkedInOauthConnection(code) {
  const tokenSet = await exchangeLinkedInCodeForToken(code);
  const profile = await fetchLinkedInUserInfo(tokenSet.access_token);
  const connection = {
    provider: "linkedin-direct",
    connected: true,
    connectedAt: new Date().toISOString(),
    token: {
      accessToken: tokenSet.access_token,
      expiresAt: Date.now() + Number(tokenSet.expires_in || 0) * 1000,
      scope: tokenSet.scope || getLinkedInConfig().scope,
    },
    profile,
  };
  writeLinkedInConnection(connection);
  writeVaultSnapshot("linkedin-direct-profile", connection);
  logEvent("linkedin_direct_connected", {
    hasEmail: Boolean(profile.email),
    profileKeys: Object.keys(profile),
  });
  return connection;
}

function readLinkedInOauthConnection() {
  return readLinkedInConnection();
}

module.exports = {
  buildLinkedInAuthUrl,
  clearPendingOauthState,
  createOauthState,
  fetchLinkedInUserInfo,
  getLinkedInConfig,
  isLinkedInConfigured,
  persistLinkedInOauthConnection,
  persistPendingOauthState,
  readLinkedInOauthConnection,
  validatePendingOauthState,
};
