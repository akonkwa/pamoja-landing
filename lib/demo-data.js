const { generateId } = require("./crypto-utils");

function buildPerson(name, year, cluster, role, org, extras = {}) {
  return {
    id: generateId("person"),
    name,
    firstSeenYear: year,
    cluster,
    primaryRole: role,
    organization: org,
    geography: extras.geography || "Cambridge",
    topic: extras.topic || cluster,
    interactionFrequency: extras.interactionFrequency ?? 0.55,
    messageHistory: extras.messageHistory ?? 0.35,
    engagementOverlap: extras.engagementOverlap ?? 0.48,
    mutualConnections: extras.mutualConnections ?? 8,
    recency: extras.recency ?? 0.62,
    sharedInstitutions: extras.sharedInstitutions ?? 1,
    highlight: extras.highlight || false,
    bio: extras.bio || "",
    goals: extras.goals || [],
    lookingFor: extras.lookingFor || [],
    preferences: extras.preferences || [],
    archetype: extras.archetype || "core",
  };
}

function buildPeople() {
  return [
    buildPerson("Arjun Mehta", 2022, "Founder Builders", "Founder", "MIT AI Venture Studio", {
      geography: "Cambridge",
      topic: "AI infra",
      interactionFrequency: 0.92,
      messageHistory: 0.74,
      engagementOverlap: 0.88,
      mutualConnections: 17,
      recency: 0.92,
      sharedInstitutions: 2,
      highlight: true,
      bio: "AI infra builder focused on multi-agent systems and developer tooling",
      goals: ["find technical cofounder"],
      lookingFor: ["backend engineers", "infra builders"],
      preferences: ["strong coding ability", "fast execution", "no purely academic profiles"],
    }),
    buildPerson("Lina Park", 2021, "Founder Builders", "Founder", "Climate Tech Lab", {
      geography: "Boston",
      topic: "climate data",
      interactionFrequency: 0.82,
      messageHistory: 0.58,
      engagementOverlap: 0.76,
      mutualConnections: 14,
      recency: 0.84,
      sharedInstitutions: 1,
      highlight: true,
      bio: "Founder building climate data platform for enterprise decisions",
      goals: ["find mission-aligned cofounder"],
      lookingFor: ["engineers with climate interest"],
      preferences: ["must care about impact", "long-term commitment"],
    }),
    buildPerson("Daniel Cohen", 2022, "Founder Builders", "Founder", "Startup Studio", {
      geography: "New York",
      topic: "fintech systems",
      interactionFrequency: 0.85,
      messageHistory: 0.62,
      engagementOverlap: 0.72,
      mutualConnections: 15,
      recency: 0.8,
      sharedInstitutions: 1,
      bio: "Fintech builder optimizing payment infrastructure",
      goals: ["build fast and launch MVP"],
      lookingFor: ["scrappy builders"],
      preferences: ["speed over perfection", "high responsiveness"],
    }),
    buildPerson("Sofia Ramirez", 2023, "Founder Builders", "Founder", "Creator Economy Lab", {
      geography: "New York",
      topic: "social apps",
      interactionFrequency: 0.78,
      messageHistory: 0.48,
      engagementOverlap: 0.81,
      mutualConnections: 11,
      recency: 0.86,
      sharedInstitutions: 1,
      bio: "Building consumer social platform for Gen Z communities",
      goals: ["find creative cofounder"],
      lookingFor: ["designers", "product thinkers"],
      preferences: ["creative mindset", "experimental"],
    }),
    buildPerson("Wei Zhang", 2021, "Founder Builders", "Founder", "Deep Tech Group", {
      geography: "San Francisco",
      topic: "ML optimization",
      interactionFrequency: 0.9,
      messageHistory: 0.67,
      engagementOverlap: 0.73,
      mutualConnections: 13,
      recency: 0.79,
      sharedInstitutions: 1,
      bio: "ML systems builder focused on model optimization",
      goals: ["build technically strong product"],
      lookingFor: ["ML engineers"],
      preferences: ["deep technical expertise only"],
    }),
    buildPerson("Marcus Johnson", 2020, "Founder Builders", "Founder", "Marketplace Lab", {
      geography: "Atlanta",
      topic: "marketplaces",
      interactionFrequency: 0.74,
      messageHistory: 0.41,
      engagementOverlap: 0.63,
      mutualConnections: 12,
      recency: 0.71,
      sharedInstitutions: 1,
      bio: "Founder building B2B marketplace for logistics",
      goals: ["scale supply and demand"],
      lookingFor: ["hustlers", "operators"],
      preferences: ["execution-focused", "sales ability"],
    }),
    buildPerson("Priya Nair", 2022, "Founder Builders", "Founder", "HealthTech Studio", {
      geography: "Boston",
      topic: "healthcare systems",
      interactionFrequency: 0.77,
      messageHistory: 0.53,
      engagementOverlap: 0.67,
      mutualConnections: 10,
      recency: 0.75,
      sharedInstitutions: 1,
      bio: "Building digital health coordination platform",
      goals: ["find domain + technical partner"],
      lookingFor: ["healthcare builders"],
      preferences: ["domain experience required"],
    }),
    buildPerson("Tom Becker", 2021, "Founder Builders", "Founder", "EdTech Lab", {
      geography: "Chicago",
      topic: "education AI",
      interactionFrequency: 0.69,
      messageHistory: 0.42,
      engagementOverlap: 0.64,
      mutualConnections: 9,
      recency: 0.72,
      sharedInstitutions: 1,
      bio: "Founder building learning platform for upskilling",
      goals: ["scale impact"],
      lookingFor: ["builders with education interest"],
      preferences: ["mission-driven", "collaborative"],
    }),
    buildPerson("Ethan Brooks", 2023, "Founder Builders", "Founder", "Dev Tools Collective", {
      geography: "San Francisco",
      topic: "dev tools",
      interactionFrequency: 0.88,
      messageHistory: 0.63,
      engagementOverlap: 0.77,
      mutualConnections: 13,
      recency: 0.87,
      sharedInstitutions: 1,
      bio: "Building developer productivity tools",
      goals: ["launch product fast"],
      lookingFor: ["engineers only"],
      preferences: ["technical depth", "no generalists"],
    }),
    buildPerson("Maya Singh", 2024, "Founder Builders", "Founder", "Startup Studio", {
      geography: "Cambridge",
      topic: "startup exploration",
      interactionFrequency: 0.73,
      messageHistory: 0.39,
      engagementOverlap: 0.58,
      mutualConnections: 12,
      recency: 0.93,
      sharedInstitutions: 2,
      highlight: true,
      archetype: "edge",
      bio: "Early-stage founder exploring product direction",
      goals: ["find cofounder or early team"],
      lookingFor: ["builders", "operators"],
      preferences: ["open to different roles", "flexible"],
    }),
    buildPerson("Alex Chen", 2020, "Operators / Joiners", "Operator", "MIT Sloan", {
      geography: "Cambridge",
      topic: "ops strategy",
      interactionFrequency: 0.7,
      messageHistory: 0.51,
      engagementOverlap: 0.62,
      mutualConnections: 11,
      recency: 0.68,
      sharedInstitutions: 2,
      bio: "Ex-consultant focused on operations and scaling",
      goals: ["join early-stage startup"],
      lookingFor: ["founders"],
      preferences: ["structured environment", "clear roadmap"],
    }),
    buildPerson("Rachel Kim", 2021, "Operators / Joiners", "Product Manager", "Product Lab", {
      geography: "New York",
      topic: "product UX",
      interactionFrequency: 0.67,
      messageHistory: 0.46,
      engagementOverlap: 0.69,
      mutualConnections: 10,
      recency: 0.74,
      sharedInstitutions: 1,
      bio: "Product manager with strong user focus",
      goals: ["build meaningful products"],
      lookingFor: ["product teams"],
      preferences: ["thoughtful decision-making"],
    }),
    buildPerson("Jordan Lee", 2022, "Operators / Joiners", "Growth Operator", "Growth Team", {
      geography: "San Francisco",
      topic: "growth analytics",
      interactionFrequency: 0.71,
      messageHistory: 0.44,
      engagementOverlap: 0.66,
      mutualConnections: 9,
      recency: 0.79,
      sharedInstitutions: 1,
      bio: "Growth operator focused on metrics and acquisition",
      goals: ["scale user base"],
      lookingFor: ["startups with traction"],
      preferences: ["data-driven teams"],
    }),
    buildPerson("Kevin Patel", 2021, "Operators / Joiners", "BizOps Generalist", "BizOps Network", {
      geography: "Boston",
      topic: "operations execution",
      interactionFrequency: 0.63,
      messageHistory: 0.4,
      engagementOverlap: 0.55,
      mutualConnections: 8,
      recency: 0.66,
      sharedInstitutions: 1,
      bio: "Generalist operator across functions",
      goals: ["support scaling startups"],
      lookingFor: ["founders"],
      preferences: ["flexible but structured"],
    }),
    buildPerson("Emily Wong", 2020, "Operators / Joiners", "Finance Strategist", "Strategy Group", {
      geography: "New York",
      topic: "finance planning",
      interactionFrequency: 0.59,
      messageHistory: 0.33,
      engagementOverlap: 0.49,
      mutualConnections: 8,
      recency: 0.61,
      sharedInstitutions: 1,
      bio: "Finance and strategy professional",
      goals: ["join stable startup"],
      lookingFor: ["structured teams"],
      preferences: ["risk-aware environments"],
    }),
    buildPerson("Luis Garcia", 2019, "Operators / Joiners", "Operations Specialist", "Supply Chain Lab", {
      geography: "Miami",
      topic: "supply chain systems",
      interactionFrequency: 0.62,
      messageHistory: 0.37,
      engagementOverlap: 0.51,
      mutualConnections: 7,
      recency: 0.58,
      sharedInstitutions: 0,
      bio: "Operations specialist in logistics",
      goals: ["optimize operations"],
      lookingFor: ["operational roles"],
      preferences: ["efficiency-focused"],
    }),
    buildPerson("Sarah Ahmed", 2021, "Operators / Joiners", "Healthcare Operator", "Health Systems", {
      geography: "Boston",
      topic: "healthcare delivery",
      interactionFrequency: 0.68,
      messageHistory: 0.45,
      engagementOverlap: 0.57,
      mutualConnections: 9,
      recency: 0.69,
      sharedInstitutions: 1,
      bio: "Healthcare operator with hospital experience",
      goals: ["improve healthcare delivery"],
      lookingFor: ["health startups"],
      preferences: ["domain relevance"],
    }),
    buildPerson("Noah Davis", 2022, "Operators / Joiners", "Marketing Operator", "Marketing Collective", {
      geography: "Los Angeles",
      topic: "marketing storytelling",
      interactionFrequency: 0.64,
      messageHistory: 0.41,
      engagementOverlap: 0.63,
      mutualConnections: 8,
      recency: 0.72,
      sharedInstitutions: 1,
      bio: "Marketing operator focused on brand and growth",
      goals: ["grow brand presence"],
      lookingFor: ["consumer startups"],
      preferences: ["creative + structured balance"],
    }),
    buildPerson("Olivia Brown", 2023, "Operators / Joiners", "Generalist", "Startup Network", {
      geography: "Cambridge",
      topic: "startup growth",
      interactionFrequency: 0.66,
      messageHistory: 0.36,
      engagementOverlap: 0.52,
      mutualConnections: 7,
      recency: 0.84,
      sharedInstitutions: 1,
      bio: "Early employee generalist",
      goals: ["join founding team"],
      lookingFor: ["flexible roles"],
      preferences: ["learning opportunities"],
    }),
    buildPerson("Ben Carter", 2024, "Operators / Joiners", "Operator to Founder", "MIT Sloan", {
      geography: "Cambridge",
      topic: "startup product",
      interactionFrequency: 0.76,
      messageHistory: 0.47,
      engagementOverlap: 0.61,
      mutualConnections: 11,
      recency: 0.9,
      sharedInstitutions: 2,
      highlight: true,
      archetype: "edge",
      bio: "Operator transitioning into founder role",
      goals: ["start company"],
      lookingFor: ["cofounders"],
      preferences: ["slightly more aligned with builders"],
    }),
    buildPerson("Jason Liu", 2024, "Social / Explorers", "Explorer", "MIT", {
      geography: "Cambridge",
      topic: "AI startups",
      interactionFrequency: 0.42,
      messageHistory: 0.18,
      engagementOverlap: 0.34,
      mutualConnections: 6,
      recency: 0.73,
      sharedInstitutions: 1,
      bio: "Interested in AI and startups, exploring options",
      goals: ["learn and meet people"],
      lookingFor: ["interesting conversations"],
      preferences: ["open-ended"],
    }),
    buildPerson("Chloe Martin", 2022, "Social / Explorers", "Community Builder", "Community Org", {
      geography: "Boston",
      topic: "events",
      interactionFrequency: 0.58,
      messageHistory: 0.26,
      engagementOverlap: 0.41,
      mutualConnections: 9,
      recency: 0.7,
      sharedInstitutions: 1,
      bio: "Community builder organizing events",
      goals: ["connect others"],
      lookingFor: ["diverse people"],
      preferences: ["warm interactions"],
    }),
    buildPerson("Ryan Scott", 2024, "Social / Explorers", "Student", "Student", {
      geography: "Cambridge",
      topic: "career exploration",
      interactionFrequency: 0.35,
      messageHistory: 0.11,
      engagementOverlap: 0.28,
      mutualConnections: 5,
      recency: 0.64,
      sharedInstitutions: 1,
      bio: "Exploring career paths",
      goals: ["learn"],
      lookingFor: ["guidance"],
      preferences: ["low pressure"],
    }),
    buildPerson("Anna Fischer", 2023, "Social / Explorers", "Generalist", "Generalist Network", {
      geography: "Berlin",
      topic: "generalist ideas",
      interactionFrequency: 0.4,
      messageHistory: 0.16,
      engagementOverlap: 0.33,
      mutualConnections: 6,
      recency: 0.62,
      sharedInstitutions: 0,
      bio: "Curious generalist across industries",
      goals: ["explore ideas"],
      lookingFor: ["conversations"],
      preferences: ["flexible"],
    }),
    buildPerson("David Kim", 2021, "Social / Explorers", "Connector", "Social Club", {
      geography: "Los Angeles",
      topic: "social lifestyle",
      interactionFrequency: 0.46,
      messageHistory: 0.22,
      engagementOverlap: 0.31,
      mutualConnections: 7,
      recency: 0.55,
      sharedInstitutions: 0,
      bio: "Enjoys meeting new people",
      goals: ["expand network"],
      lookingFor: ["anyone"],
      preferences: ["casual"],
    }),
    buildPerson("Isabella Rossi", 2022, "Social / Explorers", "Creative Thinker", "Creative Collective", {
      geography: "New York",
      topic: "art ideas",
      interactionFrequency: 0.49,
      messageHistory: 0.23,
      engagementOverlap: 0.4,
      mutualConnections: 7,
      recency: 0.67,
      sharedInstitutions: 0,
      bio: "Creative thinker interested in culture",
      goals: ["exchange ideas"],
      lookingFor: ["thinkers"],
      preferences: ["expressive people"],
    }),
    buildPerson("Ahmed Hassan", 2023, "Social / Explorers", "Explorer", "Climate Community", {
      geography: "Boston",
      topic: "climate policy",
      interactionFrequency: 0.43,
      messageHistory: 0.19,
      engagementOverlap: 0.36,
      mutualConnections: 6,
      recency: 0.61,
      sharedInstitutions: 1,
      bio: "Interested in climate but not building yet",
      goals: ["learn more"],
      lookingFor: ["discussions"],
      preferences: ["low commitment"],
    }),
    buildPerson("Sophie Turner", 2022, "Social / Explorers", "Connector", "Social Network", {
      geography: "New York",
      topic: "people",
      interactionFrequency: 0.45,
      messageHistory: 0.2,
      engagementOverlap: 0.32,
      mutualConnections: 6,
      recency: 0.57,
      sharedInstitutions: 0,
      bio: "Enjoys conversations and meeting people",
      goals: ["connect"],
      lookingFor: ["friendly people"],
      preferences: ["easygoing"],
    }),
    buildPerson("Mark Wilson", 2021, "Social / Explorers", "Explorer", "Open Network", {
      geography: "Chicago",
      topic: "general exploration",
      interactionFrequency: 0.39,
      messageHistory: 0.14,
      engagementOverlap: 0.29,
      mutualConnections: 5,
      recency: 0.51,
      sharedInstitutions: 0,
      bio: "Broad interests across many domains",
      goals: ["explore"],
      lookingFor: ["anyone"],
      preferences: ["no strict filters"],
    }),
    buildPerson("Nina Patel", 2024, "Social / Explorers", "Explorer", "Student Group", {
      geography: "Cambridge",
      topic: "startup product",
      interactionFrequency: 0.57,
      messageHistory: 0.28,
      engagementOverlap: 0.47,
      mutualConnections: 8,
      recency: 0.88,
      sharedInstitutions: 1,
      highlight: true,
      archetype: "edge",
      bio: "Slightly more serious explorer considering startups",
      goals: ["learn and maybe join"],
      lookingFor: ["operators or teams"],
      preferences: ["somewhat structured"],
    }),
  ];
}

function buildOrganizations() {
  const orgs = [
    "MIT AI Venture Studio",
    "Climate Tech Lab",
    "Startup Studio",
    "Creator Economy Lab",
    "Deep Tech Group",
    "Marketplace Lab",
    "HealthTech Studio",
    "EdTech Lab",
    "Dev Tools Collective",
    "MIT Sloan",
    "Product Lab",
    "Growth Team",
    "BizOps Network",
    "Strategy Group",
    "Supply Chain Lab",
    "Health Systems",
    "Marketing Collective",
    "Startup Network",
    "Community Org",
    "Creative Collective",
    "Climate Community",
    "Social Network",
    "Open Network",
    "Student Group",
  ];

  return orgs.map((name) => ({
    id: `org_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    name,
    type: "Organization",
  }));
}

function shouldConnect(source, target) {
  const sameCluster = source.cluster === target.cluster;
  const sameOrganization = source.organization === target.organization;
  const closeYears = Math.abs(source.firstSeenYear - target.firstSeenYear) <= 1;
  const overlappingTopic =
    source.topic.toLowerCase().includes(target.topic.toLowerCase().split(" ")[0]) ||
    target.topic.toLowerCase().includes(source.topic.toLowerCase().split(" ")[0]);
  const sameCity = source.geography === target.geography;
  const edgeBridge =
    (source.archetype === "edge" && target.cluster !== source.cluster) ||
    (target.archetype === "edge" && source.cluster !== target.cluster);

  return sameCluster || sameOrganization || closeYears || overlappingTopic || sameCity || edgeBridge;
}

function edgeStrength(source, target) {
  return Number(
    Math.min(
      0.96,
      (
        (source.interactionFrequency + target.interactionFrequency) / 2 * 0.28 +
        (source.engagementOverlap + target.engagementOverlap) / 2 * 0.2 +
        (Math.min(source.mutualConnections, target.mutualConnections) / 20) * 0.18 +
        (1 - Math.min(Math.abs(source.firstSeenYear - target.firstSeenYear) / 5, 1)) * 0.18 +
        (source.cluster === target.cluster ? 0.12 : 0) +
        ((source.archetype === "edge" || target.archetype === "edge") ? 0.08 : 0)
      ).toFixed(2)
    )
  );
}

function buildEdges(people) {
  const edges = [];

  for (let index = 0; index < people.length; index += 1) {
    for (let other = index + 1; other < people.length; other += 1) {
      const source = people[index];
      const target = people[other];

      if (!shouldConnect(source, target)) {
        continue;
      }

      edges.push({
        id: generateId("edge"),
        source: source.id,
        target: target.id,
        strength: edgeStrength(source, target),
      });
    }
  }

  return edges;
}

function buildDemoNetwork() {
  const people = buildPeople();
  const organizations = buildOrganizations();
  const edges = buildEdges(people);

  const profile = {
    name: "Akonkwa Mubagwa",
    headline: "Builder across founder matching, operators, and agentic network intelligence",
    location: "Cambridge / Boston",
    currentFocus: ["founder matching", "network intelligence", "agentic systems"],
  };

  return {
    importSource: "demo",
    profile,
    people,
    organizations,
    edges,
    raw: {
      label: "synthetic-30-agent-founder-operator-explorer-network",
      generatedAt: new Date().toISOString(),
    },
  };
}

module.exports = {
  buildDemoNetwork,
};
