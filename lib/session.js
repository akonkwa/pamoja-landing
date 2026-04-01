const crypto = require("crypto");
const { getDefaultState, readState, readUser } = require("./fs-store");

const COOKIE_NAME = "pamoja_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function getSigningSecret() {
  const user = readUser();
  if (!user) {
    return "pamoja-anon";
  }
  return `${user.username}:${user.password.hash}:${user.createdAt}`;
}

function sign(value) {
  return crypto.createHmac("sha256", getSigningSecret()).update(value).digest("hex");
}

function createSessionValue(username) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${username}|${expiresAt}`;
  return `${payload}|${sign(payload)}`;
}

function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  return header.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) {
      return acc;
    }
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function validateSession(request) {
  const cookies = parseCookies(request);
  const raw = cookies[COOKIE_NAME];
  if (!raw) {
    return null;
  }
  const [username, expiresAt, signature] = raw.split("|");
  if (!username || !expiresAt || !signature) {
    return null;
  }
  const payload = `${username}|${expiresAt}`;
  if (sign(payload) !== signature || Date.now() > Number(expiresAt)) {
    return null;
  }
  const user = readUser();
  if (!user || user.username !== username) {
    return null;
  }
  return { username };
}

function authResponsePayload() {
  const user = readUser();
  const state = readState() || getDefaultState();
  return {
    hasUser: Boolean(user),
    username: user?.username || null,
    hasImportedData: Boolean(state.importSource),
  };
}

module.exports = {
  COOKIE_NAME,
  authResponsePayload,
  createSessionValue,
  parseCookies,
  validateSession,
};
