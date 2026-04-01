# PAMOJA
## Agentic Network Intelligence for Past, Present, and Future

### Working Description
Pamoja is an agentic personal network intelligence system that helps a user understand their relationships across digital platforms and act more intentionally on them. Instead of treating LinkedIn, Instagram, Gmail, event platforms, and other communication channels as separate silos, Pamoja connects them into one evolving picture of a person's social and professional world.

The system is designed to answer three core questions:

- What has shaped my network in the past?
- What is happening in my network right now?
- What should I do next to create better opportunities in the future?

### Core Product Vision
Pamoja gives each user a persistent personal agent that can analyze signals from multiple networked platforms, build structured memory about people and interactions, and generate visual and actionable insights.

Over time, the system becomes a relationship intelligence layer for the user. It does not simply show profiles or messages. It interprets patterns, identifies meaningful clusters, highlights neglected but important connections, and recommends next actions.

For example, Pamoja can say:

- These two people do not know each other, but they are both deeply connected to the same topic and would likely benefit from meeting.
- You have a dormant relationship in your network that is highly relevant to your current goals.
- A conference or community gathering aligns strongly with your interests, goals, and existing network pathways, so you should consider attending.
- Your network over the last three years has shifted from one domain to another, and here are the people and moments that drove that change.

### Agentic System Design
Pamoja is agentic because it does more than aggregate data. It maintains memory, reasons across time, and produces recommendations.

The system includes:

- A Personal Network Agent for each user, with persistent memory about relationships, interests, goals, and past interactions.
- Source Connectors that ingest data from platforms such as LinkedIn, Instagram, Gmail, calendars, event systems, and other communication tools.
- A Memory and Knowledge Layer that stores entities, relationship histories, themes, timelines, and inferred opportunities.
- A Recommendation Layer that proposes introductions, follow-ups, events, and strategic actions based on user goals and emerging patterns.
- A Visualization Layer that presents the user's network as a dynamic view of past, present, and future.

### Past, Present, and Future Views
The product experience is organized around three lenses:

**Past**
Pamoja reconstructs how the user's network evolved over time. It identifies major phases, influential people, topic clusters, institutional affiliations, geographic shifts, and important transitions. This view helps the user understand where their current network came from and what patterns have repeated.

**Present**
Pamoja shows the current state of the user's network: active relationships, weak ties worth revisiting, overlapping communities, people connected to current goals, and emerging themes across communication and platform activity.

**Future**
Pamoja recommends actions that could improve the user's trajectory. These include people to meet, introductions to make, events to attend, relationships to strengthen, and communities that align with the user's interests and ambitions.

### Initial MVP Focus
The first MVP should be intentionally narrow:

Build a user-authorized LinkedIn analysis experience that creates a visual representation of the user's past network.

In this first version, the user connects LinkedIn through a secure, consent-based workflow. The system retrieves the information it is permitted to access, extracts profile, experience, education, connection, and activity signals where available, and generates a timeline-based map of the user's network history.

This MVP should help answer questions such as:

- Which institutions, roles, and communities shaped my network over time?
- Which people or clusters were most central in different phases of my career?
- What themes or industries have consistently appeared in my network?
- Where are the strongest bridges between my past and current professional identity?

### Example Recommendation Logic
Once the broader system is in place, Pamoja can generate insights such as:

- "You should reconnect with this person because they sit at the intersection of your current interest in climate finance and your prior work in international development."
- "These two contacts should meet because they are both working on adjacent problems in founder support but are currently in separate communities."
- "This upcoming conference is unusually relevant because several people in your network already attend it, and it aligns with your stated goals."

### Privacy and Access Principles
Pamoja should be built around explicit user consent and secure access. The user authorizes each source connection individually, and the system only retrieves the data needed for the selected experience. Where supported, official platform APIs and OAuth-based authorization should be preferred. Sensitive data such as email and social account access should be handled with strong encryption, scoped permissions, and clear user controls.

### Why This Matters
People already have rich networks, but they lack tools that help them understand how those networks formed, what they mean now, and how to use them intentionally. Pamoja turns fragmented digital traces into relationship intelligence. Its value is not just in showing data, but in helping the user see patterns, discover opportunities, and make better social and professional decisions over time.
