const { generateId } = require("./crypto-utils");

function buildPerson(name, year, cluster, role, org, extras = {}) {
  return {
    id: generateId("person"),
    name,
    firstSeenYear: year,
    cluster,
    primaryRole: role,
    organization: org,
    geography: extras.geography || "New York",
    topic: extras.topic || cluster,
    interactionFrequency: extras.interactionFrequency ?? Math.random() * 0.8 + 0.2,
    messageHistory: extras.messageHistory ?? Math.random() * 0.7,
    engagementOverlap: extras.engagementOverlap ?? Math.random() * 0.8,
    mutualConnections: extras.mutualConnections ?? Math.floor(Math.random() * 20 + 2),
    recency: extras.recency ?? Math.random(),
    sharedInstitutions: extras.sharedInstitutions ?? Math.floor(Math.random() * 3),
    highlight: extras.highlight || false,
  };
}

function buildDemoNetwork() {
  const people = [
    buildPerson("Maya Coleman", 2018, "Climate Operators", "Operator", "CityBridge", {
      topic: "climate systems",
      geography: "Boston",
      interactionFrequency: 0.92,
      messageHistory: 0.78,
      engagementOverlap: 0.84,
      mutualConnections: 18,
      recency: 0.9,
      sharedInstitutions: 2,
      highlight: true,
    }),
    buildPerson("Jonah Park", 2019, "Founder Graph", "Founder", "Northstar Labs", {
      topic: "community software",
      geography: "San Francisco",
      interactionFrequency: 0.72,
      messageHistory: 0.64,
      engagementOverlap: 0.81,
      mutualConnections: 13,
      recency: 0.75,
      sharedInstitutions: 1,
    }),
    buildPerson("Imani Cole", 2019, "Investor Mesh", "Investor", "Canvas Capital", {
      topic: "seed investing",
      geography: "New York",
      interactionFrequency: 0.58,
      messageHistory: 0.41,
      engagementOverlap: 0.66,
      mutualConnections: 14,
      recency: 0.56,
      sharedInstitutions: 1,
      highlight: true,
    }),
    buildPerson("Samuel Osei", 2020, "Climate Operators", "Program Lead", "CityBridge", {
      geography: "Accra",
      topic: "urban resilience",
      mutualConnections: 16,
      sharedInstitutions: 2,
    }),
    buildPerson("Lina Park", 2021, "Founder Graph", "Founder", "Northstar Labs", {
      geography: "Boston",
      topic: "founder communities",
      interactionFrequency: 0.8,
      sharedInstitutions: 1,
    }),
    buildPerson("Kwame Mensah", 2021, "Bridge Builders", "Ecosystem Builder", "Open Commons", {
      geography: "London",
      topic: "ecosystem partnerships",
      interactionFrequency: 0.68,
      messageHistory: 0.7,
      mutualConnections: 19,
      sharedInstitutions: 2,
      highlight: true,
    }),
    buildPerson("Nadia Elson", 2022, "Investor Mesh", "Investor", "Delta Ventures", {
      geography: "San Francisco",
      topic: "founder tooling",
      interactionFrequency: 0.44,
      messageHistory: 0.36,
      mutualConnections: 11,
    }),
    buildPerson("Rae Okafor", 2022, "Bridge Builders", "Advisor", "Open Commons", {
      geography: "Nairobi",
      topic: "cross-border systems",
      interactionFrequency: 0.75,
      messageHistory: 0.73,
      engagementOverlap: 0.7,
      mutualConnections: 20,
      recency: 0.82,
      sharedInstitutions: 3,
      highlight: true,
    }),
    buildPerson("Diego Silva", 2023, "Climate Operators", "Founder", "TerraGrid", {
      geography: "Sao Paulo",
      topic: "climate operations",
      interactionFrequency: 0.61,
      sharedInstitutions: 1,
    }),
    buildPerson("Elise Tan", 2023, "Founder Graph", "Chief of Staff", "Signal House", {
      geography: "Singapore",
      topic: "operator networks",
      mutualConnections: 10,
    }),
    buildPerson("Peter Ho", 2024, "Investor Mesh", "Principal", "Canvas Capital", {
      geography: "Singapore",
      topic: "deep tech",
      recency: 0.95,
      interactionFrequency: 0.63,
      mutualConnections: 15,
    }),
    buildPerson("Asha Raman", 2024, "Bridge Builders", "Community Lead", "Fieldcraft", {
      geography: "Toronto",
      topic: "cross-network convening",
      recency: 0.93,
      mutualConnections: 17,
      sharedInstitutions: 2,
    }),
  ];

  const profile = {
    name: "Akonkwa Mubagwa",
    headline: "Builder across founder networks, operator ecosystems, and emerging market systems",
    location: "Boston / New York",
    currentFocus: ["network intelligence", "agentic systems", "founder support"],
  };

  const organizations = [
    { id: "org_harvard", name: "Harvard", type: "Institution" },
    { id: "org_mit", name: "MIT", type: "Institution" },
    { id: "org_citybridge", name: "CityBridge", type: "Organization" },
    { id: "org_northstar", name: "Northstar Labs", type: "Organization" },
    { id: "org_canvas", name: "Canvas Capital", type: "Organization" },
    { id: "org_opencommons", name: "Open Commons", type: "Organization" },
  ];

  const edges = [];
  for (let index = 0; index < people.length; index += 1) {
    for (let other = index + 1; other < people.length; other += 1) {
      const source = people[index];
      const target = people[other];
      if (
        source.cluster === target.cluster ||
        source.organization === target.organization ||
        Math.abs(source.firstSeenYear - target.firstSeenYear) <= 1 ||
        (source.cluster === "Bridge Builders" || target.cluster === "Bridge Builders")
      ) {
        edges.push({
          id: generateId("edge"),
          source: source.id,
          target: target.id,
          strength: Number(
            (
              (source.interactionFrequency + target.interactionFrequency) / 2 * 0.3 +
              (source.engagementOverlap + target.engagementOverlap) / 2 * 0.2 +
              (Math.min(source.mutualConnections, target.mutualConnections) / 20) * 0.2 +
              (1 - Math.min(Math.abs(source.firstSeenYear - target.firstSeenYear) / 6, 1)) * 0.3
            ).toFixed(2)
          ),
        });
      }
    }
  }

  return {
    importSource: "demo",
    profile,
    people,
    organizations,
    edges,
    raw: {
      label: "synthetic-founder-operator-network",
      generatedAt: new Date().toISOString(),
    },
  };
}

module.exports = {
  buildDemoNetwork,
};
