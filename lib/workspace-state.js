const { buildDemoNetwork } = require("./demo-data");
const { logEvent, readLinkedInConnection, readState, writeRawImport, writeState } = require("./fs-store");
const { applyAnalysis, answerQuestion } = require("./network-analysis");
const { askOpenAI } = require("./openai");

function clampUnit(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, numeric));
}

function normalizeYear(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 1980 && numeric <= 2100) {
      return Math.round(numeric);
    }
  }
  return new Date().getFullYear();
}

function buildImportedEdges(people) {
  return people.flatMap((person, index) =>
    people
      .slice(index + 1)
      .filter((other) => {
        const sameOrganization = other.organization === person.organization;
        const sameCluster = other.cluster === person.cluster;
        const nearbyYear = Math.abs(other.firstSeenYear - person.firstSeenYear) <= 1;
        const sameGeography = other.geography === person.geography && other.geography !== "Unknown";
        return sameOrganization || sameCluster || nearbyYear || sameGeography;
      })
      .map((other) => {
        const sharedSignals = [
          other.organization === person.organization ? 0.34 : 0,
          other.cluster === person.cluster ? 0.28 : 0,
          Math.abs(other.firstSeenYear - person.firstSeenYear) <= 1 ? 0.18 : 0,
          other.geography === person.geography && other.geography !== "Unknown" ? 0.12 : 0,
        ].reduce((sum, entry) => sum + entry, 0);

        const behavioralSignals =
          ((person.interactionFrequency + other.interactionFrequency) / 2) * 0.18 +
          ((person.engagementOverlap + other.engagementOverlap) / 2) * 0.12;

        return {
          id: `edge_${person.id}_${other.id}`,
          source: person.id,
          target: other.id,
          strength: Number(Math.max(0.18, Math.min(0.96, sharedSignals + behavioralSignals)).toFixed(2)),
        };
      })
  );
}

function persistImportedNetwork(source, importMeta = {}) {
  const current = readState();
  const analyzed = applyAnalysis(source, current.preferences);
  const next = {
    ...current,
    ...analyzed,
    importMeta: {
      ...importMeta,
      importedAt: new Date().toISOString(),
    },
  };
  writeState(next);
  logEvent("network_imported", {
    source: source.importSource,
    people: next.people.length,
  });
  return next;
}

function loadDemoState() {
  const source = buildDemoNetwork();
  writeRawImport("demo", source);
  return persistImportedNetwork(source, {
    mode: "demo",
    note: "Synthetic founder/operator/investor network",
  });
}

function normalizeImportedPayload(payload) {
  const profile = payload.profile || {
    name: payload.name || "LinkedIn User",
    headline: payload.headline || "Imported from LinkedIn",
    location: payload.location || "Unknown",
    currentFocus: payload.currentFocus || [],
  };

  const people = (payload.people || payload.connections || [])
    .map((person, index) => ({
      id: person.id || `import_person_${index}`,
      name: person.name || person.fullName || `Connection ${index + 1}`,
      firstSeenYear: normalizeYear(person.firstSeenYear, person.year, person.connectedYear),
      cluster: person.cluster || person.industry || person.topic || "Imported Cluster",
      primaryRole: person.primaryRole || person.role || "Connection",
      organization: person.organization || person.company || "Unknown",
      geography: person.geography || person.location || "Unknown",
      topic: person.topic || person.industry || "generalist",
      interactionFrequency: clampUnit(person.interactionFrequency ?? 0.4, 0.4),
      messageHistory: clampUnit(person.messageHistory ?? 0.2, 0.2),
      engagementOverlap: clampUnit(person.engagementOverlap ?? 0.3, 0.3),
      mutualConnections: Math.max(0, Number(person.mutualConnections ?? 3) || 0),
      recency: clampUnit(person.recency ?? 0.5, 0.5),
      sharedInstitutions: Math.max(0, Number(person.sharedInstitutions ?? 0) || 0),
      highlight: Boolean(person.highlight),
    }))
    .filter((person) => person.name);

  const organizations = payload.organizations || [];
  const validIds = new Set(people.map((person) => person.id));
  const edges = Array.isArray(payload.edges)
    ? payload.edges
        .map((edge, index) => ({
          id: edge.id || `edge_imported_${index}`,
          source: edge.source,
          target: edge.target,
          strength: clampUnit(edge.strength ?? 0.55, 0.55),
        }))
        .filter((edge) => validIds.has(edge.source) && validIds.has(edge.target) && edge.source !== edge.target)
    : buildImportedEdges(people);

  return {
    importSource: "linkedin-import",
    profile,
    people,
    organizations,
    edges,
  };
}

function persistLinkedInImport(payload) {
  writeRawImport("linkedin", payload);
  return persistImportedNetwork(normalizeImportedPayload(payload), {
    mode: "linkedin",
    note: "User-consented import",
  });
}

function syncLinkedInProfileState() {
  const connection = readLinkedInConnection();
  if (!connection?.profile) {
    throw new Error("No direct LinkedIn profile is stored locally yet.");
  }

  const current = readState();
  const profile = {
    name: connection.profile.name || current.profile?.name || "LinkedIn User",
    headline: current.profile?.headline || "Connected through LinkedIn OpenID Connect",
    location:
      `${connection.profile.locale?.language || ""}${connection.profile.locale?.country ? `-${connection.profile.locale.country}` : ""}` ||
      current.profile?.location ||
      "Unknown",
    email: connection.profile.email || current.profile?.email || null,
    givenName: connection.profile.given_name || null,
    familyName: connection.profile.family_name || null,
    picture: connection.profile.picture || null,
    source: "linkedin-direct",
  };

  const next = {
    ...current,
    profile,
    importMeta: {
      ...(current.importMeta || {}),
      providerProfileCapturedAt: new Date().toISOString(),
      providerProfileSource: "linkedin-direct",
    },
  };

  if (!current.people?.length) {
    const source = {
      importSource: "linkedin-direct-profile",
      profile,
      organizations: [],
      people: [
        {
          id: "linkedin_self",
          name: profile.name,
          firstSeenYear: new Date().getFullYear(),
          cluster: "LinkedIn Identity",
          primaryRole: "Self",
          organization: "LinkedIn",
          geography: profile.location || "Unknown",
          topic: "identity profile",
          interactionFrequency: 1,
          messageHistory: 0,
          engagementOverlap: 0,
          mutualConnections: 0,
          recency: 1,
          sharedInstitutions: 0,
          highlight: true,
        },
      ],
      edges: [],
    };
    const analyzed = applyAnalysis(source, current.preferences);
    const saved = {
      ...next,
      ...analyzed,
      importMeta: next.importMeta,
    };
    writeState(saved);
    logEvent("linkedin_profile_synced", {
      mode: "graph_seeded",
      name: profile.name,
      hasEmail: Boolean(profile.email),
    });
    return saved;
  }

  writeState(next);
  logEvent("linkedin_profile_synced", {
    mode: "profile_updated",
    name: profile.name,
    hasEmail: Boolean(profile.email),
  });
  return next;
}

function updateWeights(weights) {
  const current = readState();
  const next = {
    ...current,
    preferences: {
      ...current.preferences,
      ...weights,
    },
  };
  const analyzed = applyAnalysis(next, next.preferences);
  const saved = {
    ...next,
    ...analyzed,
  };
  writeState(saved);
  logEvent("weights_updated", saved.preferences);
  return saved;
}

async function askInsight(question) {
  const current = readState();
  const openAIAnswer = await askOpenAI({ question, state: current });
  const answer = openAIAnswer || answerQuestion(question, current);
  const next = {
    ...current,
    conversation: [
      ...current.conversation,
      {
        id: `msg_${current.conversation.length + 1}`,
        question,
        answer,
        createdAt: new Date().toISOString(),
      },
    ],
    memory: {
      ...current.memory,
      pastQuestions: [...current.memory.pastQuestions, question].slice(-25),
    },
  };
  writeState(next);
  return {
    answer,
    conversation: next.conversation,
  };
}

module.exports = {
  askInsight,
  loadDemoState,
  persistImportedNetwork,
  persistLinkedInImport,
  syncLinkedInProfileState,
  updateWeights,
};
