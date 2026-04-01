const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pamoja-test-"));
process.chdir(tmpRoot);

const { encryptJson, decryptJson, hashPassword, verifyPassword } = require("../lib/crypto-utils");
const { buildDemoNetwork } = require("../lib/demo-data");
const { applyAnalysis, answerQuestion } = require("../lib/network-analysis");
const { loadDemoState, askInsight, updateWeights, persistLinkedInImport, syncLinkedInProfileState } = require("../lib/workspace-state");
const {
  logEvent,
  readEventLog,
  readRawImports,
  readVaultSnapshots,
  writeLinkedInConnection,
  writeVaultSnapshot,
} = require("../lib/fs-store");
const { buildLinkedInAuthUrl, createOauthState } = require("../lib/linkedin");

test("password hashing verifies correctly", () => {
  const record = hashPassword("secret-pass");
  assert.equal(verifyPassword("secret-pass", record), true);
  assert.equal(verifyPassword("wrong-pass", record), false);
});

test("encryptJson and decryptJson roundtrip", () => {
  const payload = { hello: "world", count: 3 };
  const encrypted = encryptJson(payload, "key-123");
  assert.notEqual(encrypted.includes("world"), true);
  const decrypted = decryptJson(encrypted, "key-123");
  assert.deepEqual(decrypted, payload);
});

test("demo analysis produces hidden clusters and bridge people", () => {
  const demo = buildDemoNetwork();
  assert.ok(demo.edges.length > 0);
  const state = applyAnalysis(demo, {
    sharedInstitutions: 0.18,
    interactionFrequency: 0.22,
    messageHistory: 0.16,
    engagementOverlap: 0.14,
    mutualConnections: 0.12,
    recency: 0.18,
  });
  assert.ok(state.people.length >= 10);
  assert.ok(state.hiddenClusters.length >= 3);
  assert.ok(state.bridgePeople.length >= 1);
  assert.ok(state.bridgePeople[0].uniqueClusters >= 1);
  assert.match(answerQuestion("What hidden cluster should I notice?", state), /cluster/i);
  assert.match(answerQuestion("Who is the bridge?", state), /bridge/i);
});

test("workspace state persists demo, weights, import, and conversation memory", async () => {
  const demo = loadDemoState();
  assert.equal(demo.importSource, "demo");

  const reweighted = updateWeights({ recency: 0.6 });
  assert.equal(reweighted.preferences.recency, 0.6);

  const imported = persistLinkedInImport({
    profile: { name: "Imported User" },
    people: [
      {
        name: "Bridge Contact",
        firstSeenYear: 2022,
        cluster: "Imported Cluster",
        organization: "Fieldcraft",
      },
      {
        name: "Second Contact",
        firstSeenYear: 2023,
        cluster: "Imported Cluster",
        organization: "Fieldcraft",
      },
    ],
  });
  assert.equal(imported.importSource, "linkedin-import");
  assert.equal(imported.people.length, 2);

  const reply = await askInsight("What bridge should I notice?");
  assert.match(reply.answer, /bridge/i);
  assert.equal(reply.conversation.length >= 1, true);
});

test("linkedin import normalizes sparse records into a stable graph", () => {
  const imported = persistLinkedInImport({
    profile: { name: "Sparse User" },
    people: [
      {
        name: "Alpha",
        company: "Common Org",
        year: "2021",
        interactionFrequency: "0.8",
      },
      {
        fullName: "Beta",
        organization: "Common Org",
        connectedYear: "2022",
        engagementOverlap: "bad-value",
      },
      {
        name: "Gamma",
        location: "Boston",
        firstSeenYear: null,
      },
    ],
  });

  assert.equal(imported.people.length, 3);
  assert.equal(imported.edges.length >= 1, true);
  assert.equal(Number.isFinite(imported.people[0].score), true);
  assert.equal(imported.timeline.length >= 1, true);
});

test("linkedin auth url builder includes required oauth parameters", () => {
  process.env.LINKEDIN_CLIENT_ID = "client-123";
  process.env.LINKEDIN_CLIENT_SECRET = "secret-123";
  process.env.LINKEDIN_REDIRECT_URI = "http://localhost:3000/api/linkedin/official/callback";
  const url = buildLinkedInAuthUrl("state-abc");
  assert.match(url, /linkedin\.com\/oauth/);
  assert.match(url, /client-123/);
  assert.match(url, /state-abc/);
});

test("direct linkedin oauth state is generated with entropy", () => {
  const first = createOauthState();
  const second = createOauthState();
  assert.equal(typeof first, "string");
  assert.equal(first.length > 20, true);
  assert.notEqual(first, second);
});

test("vault and activity log expose captured diagnostics", () => {
  writeVaultSnapshot("linkedin-profile", { connected: true, profile: { name: "Akonkwa" } });
  persistLinkedInImport({
    profile: { name: "Imported User" },
    people: [{ name: "Alpha", organization: "Common Org", year: 2022 }],
  });
  logEvent("diagnostic_check", { ok: true });

  assert.equal(readVaultSnapshots(1).length, 1);
  assert.equal(readRawImports(1).length, 1);
  assert.equal(readEventLog(1)[0].event, "diagnostic_check");
});

test("direct linkedin profile sync updates saved profile state", () => {
  writeLinkedInConnection({
    provider: "linkedin-direct",
    connected: true,
    token: {
      accessToken: "token",
      expiresAt: Date.now() + 1000,
    },
    profile: {
      name: "Akonkwa Mubagwa",
      email: "akonkwa@gmail.com",
      given_name: "Akonkwa",
      family_name: "Mubagwa",
      locale: {
        language: "en",
        country: "US",
      },
    },
  });

  const next = syncLinkedInProfileState();
  assert.equal(next.profile.name, "Akonkwa Mubagwa");
  assert.equal(next.profile.email, "akonkwa@gmail.com");
  assert.equal(next.importMeta.providerProfileSource, "linkedin-direct");
});

test("auth0 config helper reflects required environment variables", async () => {
  const { isAuth0Configured } = await import("../lib/auth0-client.js");
  delete process.env.AUTH0_SECRET;
  delete process.env.AUTH0_DOMAIN;
  delete process.env.AUTH0_CLIENT_ID;
  delete process.env.AUTH0_CLIENT_SECRET;
  assert.equal(isAuth0Configured(), false);
  process.env.AUTH0_SECRET = "secret";
  process.env.AUTH0_DOMAIN = "example.us.auth0.com";
  process.env.AUTH0_CLIENT_ID = "client";
  process.env.AUTH0_CLIENT_SECRET = "secret2";
  assert.equal(isAuth0Configured(), true);
});
