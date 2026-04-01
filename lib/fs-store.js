const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("./constants");
const { encryptJson, decryptJson } = require("./crypto-utils");

const USER_FILE = path.join(DATA_DIR, "user.json");
const SECRET_FILE = path.join(DATA_DIR, "secret.key");
const STATE_FILE = path.join(DATA_DIR, "state.enc");
const LINKEDIN_FILE = path.join(DATA_DIR, "linkedin-connection.enc");
const LINKEDIN_OAUTH_FILE = path.join(DATA_DIR, "linkedin-oauth.enc");
const RAW_DIR = path.join(DATA_DIR, "raw");
const VAULT_DIR = path.join(DATA_DIR, "vault");
const LOG_FILE = path.join(DATA_DIR, "events.log");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureBase() {
  ensureDir(DATA_DIR);
  ensureDir(RAW_DIR);
  ensureDir(VAULT_DIR);
  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, require("crypto").randomBytes(32).toString("hex"));
  }
}

function getSecret() {
  ensureBase();
  return fs.readFileSync(SECRET_FILE, "utf8").trim();
}

function logEvent(event, details = {}) {
  ensureBase();
  const entry = {
    ts: new Date().toISOString(),
    event,
    details,
  };
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`);
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readUser() {
  ensureBase();
  return readJson(USER_FILE, null);
}

function writeUser(user) {
  ensureBase();
  writeJson(USER_FILE, user);
}

function getDefaultState() {
  return {
    importSource: null,
    profile: null,
    people: [],
    organizations: [],
    edges: [],
    timeline: [],
    story: [],
    hiddenClusters: [],
    bridgePeople: [],
    conversation: [],
    preferences: {
      sharedInstitutions: 0.18,
      interactionFrequency: 0.22,
      messageHistory: 0.16,
      engagementOverlap: 0.14,
      mutualConnections: 0.12,
      recency: 0.18,
    },
    memory: {
      pastQuestions: [],
      userNotes: [],
    },
    importMeta: null,
  };
}

function readState() {
  ensureBase();
  if (!fs.existsSync(STATE_FILE)) {
    return getDefaultState();
  }
  return decryptJson(fs.readFileSync(STATE_FILE, "utf8"), getSecret());
}

function writeState(state) {
  ensureBase();
  fs.writeFileSync(STATE_FILE, encryptJson(state, getSecret()));
}

function readLinkedInConnection() {
  ensureBase();
  if (!fs.existsSync(LINKEDIN_FILE)) {
    return null;
  }
  return decryptJson(fs.readFileSync(LINKEDIN_FILE, "utf8"), getSecret());
}

function writeLinkedInConnection(connection) {
  ensureBase();
  fs.writeFileSync(LINKEDIN_FILE, encryptJson(connection, getSecret()));
}

function clearLinkedInConnection() {
  ensureBase();
  if (fs.existsSync(LINKEDIN_FILE)) {
    fs.unlinkSync(LINKEDIN_FILE);
  }
}

function readLinkedInOauthState() {
  ensureBase();
  if (!fs.existsSync(LINKEDIN_OAUTH_FILE)) {
    return null;
  }
  return decryptJson(fs.readFileSync(LINKEDIN_OAUTH_FILE, "utf8"), getSecret());
}

function writeLinkedInOauthState(state) {
  ensureBase();
  fs.writeFileSync(LINKEDIN_OAUTH_FILE, encryptJson(state, getSecret()));
}

function clearLinkedInOauthState() {
  ensureBase();
  if (fs.existsSync(LINKEDIN_OAUTH_FILE)) {
    fs.unlinkSync(LINKEDIN_OAUTH_FILE);
  }
}

function writeRawImport(label, payload) {
  ensureBase();
  const filename = `${Date.now()}-${label}.enc`;
  const filePath = path.join(RAW_DIR, filename);
  fs.writeFileSync(filePath, encryptJson(payload, getSecret()));
  return filePath;
}

function writeVaultSnapshot(label, payload) {
  ensureBase();
  const filename = `${Date.now()}-${label}.enc`;
  const filePath = path.join(VAULT_DIR, filename);
  fs.writeFileSync(filePath, encryptJson(payload, getSecret()));
  return filePath;
}

function readEncryptedCollection(dir, limit = 10) {
  ensureBase();
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".enc"))
    .sort()
    .reverse()
    .slice(0, limit)
    .map((file) => {
      const fullPath = path.join(dir, file);
      try {
        const payload = decryptJson(fs.readFileSync(fullPath, "utf8"), getSecret());
        return {
          id: file,
          createdAt: new Date(Number(file.split("-")[0]) || Date.now()).toISOString(),
          label: file.split("-").slice(1).join("-").replace(/\.enc$/, ""),
          payload,
        };
      } catch (error) {
        return {
          id: file,
          createdAt: new Date().toISOString(),
          label: "unreadable",
          payload: { error: error.message },
        };
      }
    });
}

function readVaultSnapshots(limit = 10) {
  return readEncryptedCollection(VAULT_DIR, limit);
}

function readRawImports(limit = 10) {
  return readEncryptedCollection(RAW_DIR, limit);
}

function readEventLog(limit = 40) {
  ensureBase();
  if (!fs.existsSync(LOG_FILE)) {
    return [];
  }
  return fs
    .readFileSync(LOG_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return {
          ts: new Date().toISOString(),
          event: "log_parse_error",
          details: { message: error.message },
        };
      }
    })
    .slice(-limit)
    .reverse();
}

module.exports = {
  getDefaultState,
  logEvent,
  readEventLog,
  readLinkedInConnection,
  readLinkedInOauthState,
  readRawImports,
  readState,
  readUser,
  readVaultSnapshots,
  clearLinkedInConnection,
  clearLinkedInOauthState,
  writeLinkedInConnection,
  writeLinkedInOauthState,
  writeRawImport,
  writeState,
  writeUser,
  writeVaultSnapshot,
};
