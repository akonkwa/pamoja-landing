function normalizeWeightValue(value) {
  if (Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeNumber(value, fallback = 0) {
  if (Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function scorePerson(person, weights) {
  return (
    normalizeWeightValue(weights.sharedInstitutions) * Math.min(safeNumber(person.sharedInstitutions) / 3, 1) +
    normalizeWeightValue(weights.interactionFrequency) * safeNumber(person.interactionFrequency) +
    normalizeWeightValue(weights.messageHistory) * safeNumber(person.messageHistory) +
    normalizeWeightValue(weights.engagementOverlap) * safeNumber(person.engagementOverlap) +
    normalizeWeightValue(weights.mutualConnections) * Math.min(safeNumber(person.mutualConnections) / 20, 1) +
    normalizeWeightValue(weights.recency) * safeNumber(person.recency)
  );
}

function computeTimeline(people) {
  const byYear = new Map();
  for (const person of people) {
    const year = safeNumber(person.firstSeenYear, new Date().getFullYear());
    const entry = byYear.get(year) || {
      year,
      count: 0,
      clusters: {},
      notablePeople: [],
    };
    entry.count += 1;
    entry.clusters[person.cluster || "Imported Cluster"] = (entry.clusters[person.cluster || "Imported Cluster"] || 0) + 1;
    if (person.highlight) {
      entry.notablePeople.push(person.name);
    }
    byYear.set(year, entry);
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

function findHiddenClusters(people) {
  const clusterMap = new Map();
  for (const person of people) {
    const entry = clusterMap.get(person.cluster) || {
      label: person.cluster || "Imported Cluster",
      topics: new Set(),
      people: [],
      years: [],
    };
    entry.topics.add(person.topic || "generalist");
    entry.people.push(person.name);
    entry.years.push(safeNumber(person.firstSeenYear, new Date().getFullYear()));
    clusterMap.set(person.cluster || "Imported Cluster", entry);
  }

  return [...clusterMap.values()]
    .map((entry) => ({
      label: entry.label,
      size: entry.people.length,
      span: `${Math.min(...entry.years)}-${Math.max(...entry.years)}`,
      topicSummary: [...entry.topics].slice(0, 3),
      people: entry.people.slice(0, 4),
    }))
    .sort((a, b) => b.size - a.size);
}

function findBridgePeople(people, edges, weights) {
  const edgeMap = new Map();
  for (const edge of edges) {
    edgeMap.set(edge.id, edge);
  }

  const results = people
    .map((person) => {
      const connected = edges.filter(
        (edge) => edge.source === person.id || edge.target === person.id
      );
      const clusterTargets = new Set();
      let bridgeScore = 0;
      for (const edge of connected) {
        const otherId = edge.source === person.id ? edge.target : edge.source;
        const other = people.find((candidate) => candidate.id === otherId);
        if (!other) {
          continue;
        }
        clusterTargets.add(other.cluster);
        if (other.cluster !== person.cluster) {
          bridgeScore += edge.strength;
        }
      }
      bridgeScore += scorePerson(person, weights);
      return {
        ...person,
        bridgeScore: Number(bridgeScore.toFixed(3)),
        uniqueClusters: clusterTargets.size,
      };
    })
    .sort((a, b) => b.bridgeScore - a.bridgeScore);

  return results.slice(0, 4);
}

function buildStory(state) {
  const topCluster = state.hiddenClusters[0];
  const topBridge = state.bridgePeople[0];
  const nextBridge = state.bridgePeople[1];
  const strongestYear = [...state.timeline].sort((a, b) => b.count - a.count)[0];

  return [
    {
      title: "Hidden cluster",
      body: topCluster
        ? `${topCluster.label} appears as a dense cluster with activity spanning ${topCluster.span}. It suggests a durable pocket of network energy around ${topCluster.topicSummary.join(", ")}.`
        : "No hidden cluster emerged yet.",
    },
    {
      title: "Bridge person",
      body: topBridge
        ? `${topBridge.name} is your strongest bridge across disconnected groups, touching ${topBridge.uniqueClusters} clusters while staying relevant to your current weighting model.`
        : "Bridge analysis needs more data.",
    },
    {
      title: "Momentum phase",
      body: strongestYear
        ? `${strongestYear.year} stands out as a network expansion phase with ${strongestYear.count} notable people entering the graph.`
        : "Timeline momentum will appear after import.",
    },
    {
      title: "Cross-cluster opportunity",
      body:
        topBridge && nextBridge
          ? `${topBridge.name} and ${nextBridge.name} sit near the seams of different clusters, which is why your network can move between communities instead of staying trapped inside one lane.`
          : "Cross-cluster opportunities need additional graph structure.",
    },
  ];
}

function applyAnalysis(source, preferences) {
  const people = (source.people || []).map((person) => ({
    ...person,
    score: Number(scorePerson(person, preferences).toFixed(3)),
  }));
  const timeline = computeTimeline(people);
  const hiddenClusters = findHiddenClusters(people);
  const bridgePeople = findBridgePeople(people, source.edges || [], preferences);
  return {
    importSource: source.importSource,
    profile: source.profile,
    people,
    organizations: source.organizations || [],
    edges: source.edges || [],
    timeline,
    hiddenClusters,
    bridgePeople,
    story: buildStory({ timeline, hiddenClusters, bridgePeople }),
  };
}

function answerQuestion(question, state) {
  const lower = question.toLowerCase();
  if (lower.includes("cluster")) {
    const cluster = state.hiddenClusters[0];
    return cluster
      ? `The strongest hidden cluster is ${cluster.label}. It spans ${cluster.span} and gathers people around ${cluster.topicSummary.join(", ")}.`
      : "I do not have enough network data to identify a hidden cluster yet.";
  }
  if (lower.includes("bridge") || lower.includes("connect")) {
    const person = state.bridgePeople[0];
    return person
      ? `${person.name} is your clearest bridge. They connect ${person.uniqueClusters} clusters and rank highly under your current relationship weights.`
      : "I need richer graph structure before I can identify bridge people.";
  }
  if (lower.includes("year") || lower.includes("phase") || lower.includes("timeline")) {
    const year = [...state.timeline].sort((a, b) => b.count - a.count)[0];
    return year
      ? `${year.year} was your most active network expansion phase in this model, with ${year.count} significant people entering the graph.`
      : "Your timeline does not yet show a clear expansion phase.";
  }
  return "Your network shows a mix of durable clusters and bridge relationships. Try asking about hidden clusters, bridges, or timeline shifts.";
}

module.exports = {
  answerQuestion,
  applyAnalysis,
  scorePerson,
};
