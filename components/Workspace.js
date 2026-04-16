"use client";

import { useEffect, useMemo, useState } from "react";
import GraphCanvas from "./GraphCanvas";

const sampleCsv = `name,email,affiliation,bio,interests,goals,looking_for,preferences
Kofi Mensah,kofi@example.com,MetroLab,Urban systems operator exploring civic pilots,climate; cities; operations,find founders for pilots,founders; operators,clear use cases; warm intros
Nia Okeke,nia@example.com,Atlas Studio,Designer building community onboarding flows,community; design; events,meet product collaborators,operators; designers,high-context conversations; generous people`;

const initialProfileForm = {
  name: "Akonkwa Mubagwa",
  email: "akonkwa@example.com",
  affiliation: "MIT AI Venture Studio",
  bio: "Builder interested in network intelligence, founder matching, and agentic event systems.",
  interestsText: "agents, founder communities, climate, systems",
  goalsText: "find cofounders, meet ecosystem operators",
  lookingForText: "builders, operators, pilot partners",
  preferencesText: "warm intros, practical conversations",
  consentedMemory: true,
  relationStatus: "attending",
};

const initialEventForm = {
  communityName: "Umoja Class Demo",
  title: "Agentic Match Night",
  description: "An event agent for pairing people based on complementary skills, goals, and prior memory.",
  startAt: "2026-04-10T18:30",
  location: "Cambridge, MA",
  tagsText: "agents, founders, operators",
};

const initialDebriefForm = {
  usefulnessRating: 5,
  notes: "Strong overlap on community software and live pilots.",
  followUp: true,
};

const initialAgentPrompt =
  "Create the agent Akonkwa Mubagwa, his goals are entrepreneurship in Africa, and he is looking for founders and operators.";

function tokenize(text) {
  return String(text || "")
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(dateString) {
  if (!dateString) {
    return "TBD";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function labelForProfile(agent, usersById) {
  const user = usersById.get(agent.userId);
  return user?.name || "Unknown agent";
}

function buildMatchNarrative(selectedProfile, usersById, recommendations) {
  if (!selectedProfile || !recommendations.length) {
    return "";
  }

  const profileName = labelForProfile(selectedProfile, usersById);
  const topMatches = recommendations
    .slice(0, 2)
    .map((item) => `${item.name} because of ${item.reason}`)
    .join(" and ");

  return `${profileName} is best paired with ${topMatches}. This pairing is based on overlapping goals, interests, and event context already stored by the agent system.`;
}

function formatRelativeDate(dateString) {
  if (!dateString) {
    return "No recent meeting";
  }

  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  if (days === 0) {
    return "Met today";
  }
  if (days === 1) {
    return "Met 1d ago";
  }
  return `Met ${days}d ago`;
}

function buildDirectoryEntries(dashboard, usersById) {
  const profileAgents = dashboard?.profileAgents || [];
  const events = dashboard?.events || [];
  const profileMemory = dashboard?.profileMemory || [];
  const interactionMemory = dashboard?.interactionMemory || [];

  const entries = new Map();

  profileAgents.forEach((agent) => {
    const user = usersById.get(agent.userId);
    const event = events.find((item) => item.id === agent.eventId);
    if (!user) {
      return;
    }

    const key = agent.userId;
    const existing = entries.get(key) || {
      id: key,
      name: user.name,
      affiliation: user.affiliation,
      bio: agent.bio,
      tags: new Set(),
      noteCount: 0,
      todoCount: 0,
      lastSeenAt: event?.startAt || agent.updatedAt || agent.createdAt,
      lastSeenLabel: event?.title || "Profile Agent",
      profileAgentId: agent.id,
    };

    [...(agent.interests || []), ...(agent.goals || []), ...(agent.lookingFor || [])]
      .slice(0, 5)
      .forEach((tag) => existing.tags.add(tag));

    if (event?.startAt && new Date(event.startAt) > new Date(existing.lastSeenAt || 0)) {
      existing.lastSeenAt = event.startAt;
      existing.lastSeenLabel = event.title;
    }

    existing.bio = existing.bio || agent.bio;
    existing.profileAgentId = agent.id;
    entries.set(key, existing);
  });

  profileMemory.forEach((memory) => {
    const agent = profileAgents.find((item) => item.id === memory.profileAgentId);
    if (!agent) {
      return;
    }
    const entry = entries.get(agent.userId);
    if (entry) {
      entry.noteCount += 1;
    }
  });

  interactionMemory.forEach((memory) => {
    const agents = profileAgents.filter(
      (item) => item.id === memory.profileAgentId || item.id === memory.otherProfileAgentId
    );
    agents.forEach((agent) => {
      const entry = entries.get(agent.userId);
      if (!entry) {
        return;
      }
      entry.noteCount += 1;
      if (memory.followUpState === "requested") {
        entry.todoCount += 1;
      }
    });
  });

  return [...entries.values()]
    .map((entry) => ({
      ...entry,
      tags: [...entry.tags].slice(0, 4),
    }))
    .sort((left, right) => new Date(right.lastSeenAt || 0) - new Date(left.lastSeenAt || 0));
}

function formatDigestDay(iteration) {
  if (!iteration) {
    return "Day 0";
  }
  return `Day ${iteration}`;
}

function joinNames(items, key = "name") {
  return (items || [])
    .map((item) => item?.[key])
    .filter(Boolean)
    .join(", ");
}

function buildDebriefSummary(debrief) {
  const met = joinNames(debrief?.metPeople || []);
  return `${met || "No one recorded"} · usefulness ${debrief?.usefulnessRating || "n/a"}/5${debrief?.notes ? ` · ${debrief.notes}` : ""}`;
}

function buildTimelineDays({ digestHistory, debriefHistory }) {
  const byDay = new Map();

  digestHistory.forEach((digest) => {
    const day = Number(digest.iteration || 0);
    const bucket = byDay.get(day) || { day, digests: [], debriefs: [] };
    bucket.digests.push(digest);
    byDay.set(day, bucket);
  });

  debriefHistory.forEach((debrief) => {
    const day = Number(debrief.simulationDay || 0);
    const bucket = byDay.get(day) || { day, digests: [], debriefs: [] };
    bucket.debriefs.push(debrief);
    byDay.set(day, bucket);
  });

  return [...byDay.values()].sort((left, right) => right.day - left.day);
}

function buildSignalPanelData({
  selectedProfile,
  selectedEvent,
  usersById,
  digestHistory,
  debriefHistory,
  dashboard,
}) {
  if (selectedProfile) {
    const user = usersById.get(selectedProfile.userId);
    const latestDigest = digestHistory.find((item) => item.profileAgentId === selectedProfile.id) || null;
    const latestDebrief = debriefHistory.find((item) => item.profileAgentId === selectedProfile.id) || null;

    return {
      eyebrow: user?.affiliation || "Profile Agent",
      title: user?.name || "Selected profile",
      about: selectedProfile.bio || selectedProfile.memorySummary || "No profile summary yet.",
      tags: [...(selectedProfile.interests || []), ...(selectedProfile.goals || [])].slice(0, 5),
      iterationLabel: latestDigest ? formatDigestDay(latestDigest.iteration) : "No simulation yet",
      iterationMode: latestDigest?.modeLabel || "Awaiting first autonomous run",
      iterationSummary:
        latestDigest?.summary || "This agent has not completed an autonomous background pass yet.",
      meta: latestDebrief
        ? `Latest debrief: ${buildDebriefSummary(latestDebrief)}`
        : `Looking for: ${joinNames(selectedProfile.lookingFor) || "n/a"}`,
    };
  }

  if (selectedEvent) {
    const eventAgent = (dashboard?.eventAgents || []).find((item) => item.eventId === selectedEvent.id);
    const community = (dashboard?.communities || []).find((item) => item.id === selectedEvent.communityId);

    return {
      eyebrow: community?.name || "Event Agent",
      title: selectedEvent.title,
      about: selectedEvent.description || eventAgent?.summary || "No event summary yet.",
      tags: [...(selectedEvent.tags || []), ...(eventAgent?.themes || [])].slice(0, 5),
      iterationLabel: "Current universe focus",
      iterationMode: `${selectedEvent.attendeeCount || 0} attendees in orbit`,
      iterationSummary:
        eventAgent?.summary || "This event agent is representing attendance and thematic overlap.",
      meta: selectedEvent.location
        ? `${selectedEvent.location} · ${formatDate(selectedEvent.startAt)}`
        : "Location pending",
    };
  }

  return null;
}

export default function Workspace({ dashboard, setDashboard, api, error }) {
  const [activeLeftTab, setActiveLeftTab] = useState("prompt");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [recommendationState, setRecommendationState] = useState(null);
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [csvText, setCsvText] = useState(sampleCsv);
  const [debriefForm, setDebriefForm] = useState(initialDebriefForm);
  const [metProfileIds, setMetProfileIds] = useState([]);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [latestDigest, setLatestDigest] = useState(null);
  const [agentPrompt, setAgentPrompt] = useState(initialAgentPrompt);
  const [agentReply, setAgentReply] = useState("");
  const [agentReplyMeta, setAgentReplyMeta] = useState(null);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [telegramLink, setTelegramLink] = useState(null);
  const [busy, setBusy] = useState("");
  const [localError, setLocalError] = useState(error || "");

  useEffect(() => {
    setLocalError(error || "");
  }, [error]);

  useEffect(() => {
    api.callJson("/api/telegram/status").then(setTelegramStatus).catch(() => null);
  }, [api]);

  const usersById = useMemo(
    () => new Map((dashboard?.users || []).map((user) => [user.id, user])),
    [dashboard]
  );

  const events = dashboard?.events || [];
  const profileAgents = dashboard?.profileAgents || [];
  const persistedRecommendations = useMemo(
    () =>
      (dashboard?.recommendations || [])
        .filter(
          (item) =>
            item.eventId === selectedEventId &&
            item.requesterProfileAgentId === selectedProfileId
        )
        .map((item) => {
          const recommendedProfile =
            profileAgents.find((agent) => agent.id === item.recommendedProfileAgentId) || null;
          const recommendedUser = recommendedProfile
            ? usersById.get(recommendedProfile.userId)
            : null;

          return {
            id: item.id,
            rank: item.rank,
            score: item.score,
            reason: item.reason,
            profileAgentId: item.recommendedProfileAgentId,
            recommendedProfileAgentId: item.recommendedProfileAgentId,
            name: recommendedUser?.name || "Unknown agent",
            affiliation: recommendedUser?.affiliation || "",
            bio: recommendedProfile?.bio || "",
          };
        })
        .sort((left, right) => left.rank - right.rank),
    [dashboard, profileAgents, selectedEventId, selectedProfileId, usersById]
  );
  const recommendations =
    recommendationState?.event?.id === selectedEventId &&
    recommendationState?.requester?.id === selectedProfileId &&
    recommendationState?.recommendations?.length
      ? recommendationState.recommendations
      : persistedRecommendations;

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId("");
      return;
    }
    if (!selectedEventId || !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const eventProfiles = useMemo(
    () => profileAgents.filter((agent) => agent.eventId === selectedEventId),
    [profileAgents, selectedEventId]
  );

  useEffect(() => {
    if (!eventProfiles.length) {
      setSelectedProfileId("");
      return;
    }
    if (!selectedProfileId || !eventProfiles.some((agent) => agent.id === selectedProfileId)) {
      setSelectedProfileId(eventProfiles[0].id);
    }
  }, [eventProfiles, selectedProfileId]);

  const selectedEvent = events.find((event) => event.id === selectedEventId) || null;
  const selectedProfile = eventProfiles.find((agent) => agent.id === selectedProfileId) || null;
  useEffect(() => {
    setTelegramLink(null);
  }, [selectedProfileId]);

  const selectedTelegramConnection = useMemo(
    () =>
      (dashboard?.telegramConnections || []).find(
        (item) => item.profileAgentId === selectedProfileId
      ) || null,
    [dashboard, selectedProfileId]
  );
  const latestDebrief = useMemo(
    () =>
      (dashboard?.debriefs || [])
        .filter(
          (item) =>
            item.eventId === selectedEventId &&
            (!selectedProfileId || item.profileAgentId === selectedProfileId)
        )
        .slice()
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0] || null,
    [dashboard, selectedEventId, selectedProfileId]
  );
  const debriefHistory = useMemo(
    () =>
      (dashboard?.debriefs || [])
        .filter((item) => !selectedProfileId || item.profileAgentId === selectedProfileId)
        .slice()
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    [dashboard, selectedProfileId]
  );
  const latestDebriefProfile =
    latestDebrief
      ? profileAgents.find((agent) => agent.id === latestDebrief.profileAgentId) || null
      : null;
  const matchNarrative = useMemo(
    () =>
      recommendationState?.narrative ||
      buildMatchNarrative(selectedProfile, usersById, recommendations),
    [recommendationState, selectedProfile, usersById, recommendations]
  );
  const directoryEntries = useMemo(
    () => buildDirectoryEntries(dashboard, usersById),
    [dashboard, usersById]
  );
  const digestHistory = useMemo(
    () =>
      (dashboard?.agentDigests || [])
        .filter((digest) => !selectedProfileId || digest.profileAgentId === selectedProfileId)
        .slice()
        .sort((left, right) => right.iteration - left.iteration),
    [dashboard, selectedProfileId]
  );
  const activeDigest = latestDigest || digestHistory[0] || null;
  const highlightedPeople = useMemo(
    () =>
      new Set([...(activeDigest?.people || []), ...(activeDigest?.bridges || [])].map((item) => item.profileAgentId)),
    [activeDigest]
  );
  const highlightedCommunities = useMemo(
    () => new Set((activeDigest?.communities || []).map((item) => item.name)),
    [activeDigest]
  );
  const dayAwareDirectoryEntries = useMemo(() => {
    const recommendationIds = new Set(recommendations.map((item) => item.profileAgentId));
    return directoryEntries
      .map((entry) => {
        const profile = profileAgents.find((agent) => agent.id === entry.profileAgentId);
        const event = events.find((item) => item.id === profile?.eventId);
        const communityName =
          (dashboard?.communities || []).find((community) => community.id === event?.communityId)?.name || "";
        const notes = [];
        let activityScore = 0;

        if (highlightedPeople.has(entry.profileAgentId)) {
          notes.push(`Featured in ${formatDigestDay(activeDigest?.iteration || 0)} digest`);
          activityScore += 5;
        }

        if (recommendationIds.has(entry.profileAgentId)) {
          notes.push("Recommended for pairing today");
          activityScore += 4;
        }

        if (communityName && highlightedCommunities.has(communityName)) {
          notes.push("Active in a community the agent is exploring");
          activityScore += 3;
        }

        const latestMention = debriefHistory.find((debrief) =>
          (debrief.metPeople || []).some((person) => person.profileAgentId === entry.profileAgentId)
        );
        if (latestMention) {
          notes.push(`Mentioned in ${formatDigestDay(latestMention.simulationDay || 0)} debrief`);
          activityScore += 2;
        }

        return {
          ...entry,
          activityLine: notes[0] || "Stable contact in the universe",
          activityScore,
        };
      })
      .sort((left, right) => {
        if (right.activityScore !== left.activityScore) {
          return right.activityScore - left.activityScore;
        }
        return new Date(right.lastSeenAt || 0) - new Date(left.lastSeenAt || 0);
      });
  }, [directoryEntries, recommendations, profileAgents, events, dashboard, highlightedPeople, highlightedCommunities, activeDigest, debriefHistory]);
  const filteredDirectoryEntries = useMemo(() => {
    const query = directoryQuery.trim().toLowerCase();
    if (!query) {
      return dayAwareDirectoryEntries;
    }

    return dayAwareDirectoryEntries.filter((entry) =>
      [entry.name, entry.affiliation, entry.bio, entry.activityLine, ...(entry.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [dayAwareDirectoryEntries, directoryQuery]);
  const timelineDays = useMemo(
    () => buildTimelineDays({ digestHistory, debriefHistory }),
    [digestHistory, debriefHistory]
  );
  const signalPanel = useMemo(
    () =>
      buildSignalPanelData({
        selectedProfile,
        selectedEvent,
        usersById,
        digestHistory,
        debriefHistory,
        dashboard,
      }),
    [selectedProfile, selectedEvent, usersById, digestHistory, debriefHistory, dashboard]
  );
  const llmProvider = dashboard?.integrations?.llmProvider || "";
  const llmOptions = dashboard?.integrations?.llmOptions || [];

  async function refreshUniverse() {
    const nextDashboard = await api.callJson("/api/dashboard");
    setDashboard(nextDashboard);
    return nextDashboard;
  }

  useEffect(() => {
    let cancelled = false;

    async function pollDashboard() {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        const nextDashboard = await api.callJson("/api/dashboard");
        if (!cancelled) {
          setDashboard(nextDashboard);
        }
      } catch (error) {}
    }

    const intervalId = setInterval(pollDashboard, 5000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [api, setDashboard]);

  async function switchLlmProvider(provider) {
    setBusy("llm-provider");
    setLocalError("");
    try {
      await api.callJson("/api/llm-provider", {
        method: "POST",
        body: JSON.stringify({ provider }),
      });
      await refreshUniverse();
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function resetUniverse() {
    setBusy("reset");
    setLocalError("");
    try {
      const nextDashboard = await api.callJson("/api/dashboard/reset", { method: "POST" });
      setDashboard(nextDashboard);
      setRecommendationState(null);
      setLatestDigest(null);
      setAgentReply("");
      setAgentReplyMeta(null);
      setTelegramLink(null);
      setMetProfileIds([]);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function createEvent(event) {
    event.preventDefault();
    setBusy("event");
    setLocalError("");
    try {
      const payload = await api.callJson("/api/events", {
        method: "POST",
        body: JSON.stringify({
          communityName: eventForm.communityName,
          title: eventForm.title,
          description: eventForm.description,
          startAt: eventForm.startAt,
          location: eventForm.location,
          tags: tokenize(eventForm.tagsText),
        }),
      });
      await refreshUniverse();
      setSelectedEventId(payload.event.id);
      setSelectedProfileId("");
      setEventForm((current) => ({
        ...current,
        title: "",
        description: "",
        location: "",
        tagsText: "",
      }));
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function createProfileAgent(event) {
    event.preventDefault();
    if (!selectedEventId) {
      setLocalError("Select an event first.");
      return;
    }

    setBusy("profile");
    setLocalError("");
    try {
      const payload = await api.callJson("/api/profile-agents", {
        method: "POST",
        body: JSON.stringify({
          eventId: selectedEventId,
          ...profileForm,
        }),
      });
      await refreshUniverse();
      setSelectedProfileId(payload.profileAgent.id);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function importAttendees() {
    if (!selectedEventId) {
      setLocalError("Select an event before importing attendees.");
      return;
    }

    setBusy("import");
    setLocalError("");
    try {
      await api.callJson(`/api/events/${selectedEventId}/attendees/import`, {
        method: "POST",
        body: JSON.stringify({ csvText }),
      });
      await refreshUniverse();
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function runPairing() {
    if (!selectedEventId || !selectedProfileId) {
      setLocalError("Select both an event and a profile agent.");
      return;
    }

    setBusy("pair");
    setLocalError("");
    try {
      const payload = await api.callJson("/api/recommendations/query", {
        method: "POST",
        body: JSON.stringify({
          eventId: selectedEventId,
          profileAgentId: selectedProfileId,
          query: "Who should this agent meet next?",
        }),
      });
      setRecommendationState(payload);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function saveDebrief(event) {
    event.preventDefault();
    if (!selectedEventId || !selectedProfileId) {
      setLocalError("Select both an event and a profile agent.");
      return;
    }

    setBusy("debrief");
    setLocalError("");
    try {
      await api.callJson("/api/debriefs", {
        method: "POST",
        body: JSON.stringify({
          eventId: selectedEventId,
          profileAgentId: selectedProfileId,
          metProfileAgentIds: metProfileIds,
          usefulnessRating: Number(debriefForm.usefulnessRating),
          notes: debriefForm.notes,
          followUp: debriefForm.followUp,
        }),
      });
      await refreshUniverse();
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function advanceAgentIteration() {
    if (!selectedProfileId) {
      setLocalError("Select a profile agent before advancing the simulation.");
      return;
    }

    setBusy("simulate");
    setLocalError("");
    try {
      const payload = await api.callJson("/api/agent-simulations", {
        method: "POST",
        body: JSON.stringify({
          eventId: selectedEventId,
          profileAgentId: selectedProfileId,
        }),
      });
      setLatestDigest(payload.digest);
      await refreshUniverse();
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function askAgent(event) {
    event.preventDefault();
    setBusy("agent-chat");
    setLocalError("");
    try {
      const payload = await api.callJson("/api/agent-chat", {
        method: "POST",
        body: JSON.stringify({
          eventId: selectedEventId,
          profileAgentId: selectedProfileId,
          question: agentPrompt,
        }),
      });
      setAgentReply(payload.reply || "");
      setAgentReplyMeta({
        source: payload.source || (payload.mode === "create" ? "app" : "fallback"),
        confidence: payload.confidence || null,
        provider: payload.provider || null,
        failedOver: Boolean(payload.failedOver),
        attemptedProviders: payload.attemptedProviders || [],
        toolNames: payload.toolNames || [],
      });
      await refreshUniverse();
      if (payload.mode === "create" && payload.profileAgent?.id) {
        setSelectedEventId(payload.eventId || selectedEventId);
        setSelectedProfileId(payload.profileAgent.id);
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function connectTelegram() {
    if (!selectedProfileId) {
      setLocalError("Select a profile agent before connecting Telegram.");
      return;
    }

    setBusy("telegram-connect");
    setLocalError("");
    try {
      const payload = await api.callJson("/api/telegram/connect", {
        method: "POST",
        body: JSON.stringify({
          profileAgentId: selectedProfileId,
        }),
      });
      setTelegramLink(payload);
      const nextStatus = await api.callJson("/api/telegram/status");
      setTelegramStatus(nextStatus);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function setupTelegramWebhook() {
    setBusy("telegram-setup");
    setLocalError("");
    try {
      await api.callJson("/api/telegram/setup", {
        method: "POST",
      });
      const nextStatus = await api.callJson("/api/telegram/status");
      setTelegramStatus(nextStatus);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  function toggleMetProfile(profileAgentId) {
    setMetProfileIds((current) =>
      current.includes(profileAgentId)
        ? current.filter((id) => id !== profileAgentId)
        : [...current, profileAgentId]
    );
  }

  return (
    <main className="workspace">
      <header className="hero panel">
        <div className="hero-copy">
          <div className="eyebrow">UMOJA AGENTIC SOCIAL UNIVERSE</div>
          <h1>Every profile is an agent. Every event is an agent.</h1>
          <p className="lead">
            Seed a universe with dummy profiles and events, add your own profile agents, create new
            event agents, and run pairing recommendations backed by real backend state, memory, and
            debrief records.
          </p>
        </div>
        <div className="hero-actions">
          <div className="hero-status-row">
            <div className="simulation-day-badge">
              <span>Simulation</span>
              <strong>{formatDigestDay(dashboard?.stats?.simulationDay || 0)}</strong>
            </div>
            <div className="model-toggle">
              <span>Model</span>
              <div className="model-toggle-buttons">
                {llmOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={llmProvider === option.id ? "model-pill active" : "model-pill"}
                    disabled={!option.enabled || busy === "llm-provider"}
                    onClick={() => switchLlmProvider(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="hero-button-row">
            <button onClick={resetUniverse} disabled={busy === "reset"} type="button">
              {busy === "reset" ? "RESETTING..." : "RESET UNIVERSE"}
            </button>
            <button className="ghost-button" onClick={runPairing} disabled={busy === "pair"} type="button">
              {busy === "pair" ? "PAIRING..." : "RUN PAIRING"}
            </button>
            <button className="ghost-button" onClick={advanceAgentIteration} disabled={busy === "simulate"} type="button">
              {busy === "simulate" ? "ADVANCING..." : "ADVANCE DAY"}
            </button>
          </div>
        </div>
      </header>

      <section className="dashboard-shell">
        <div className="dashboard-left">
          <section className="left-tabs panel">
            <button
              type="button"
              className={activeLeftTab === "prompt" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveLeftTab("prompt")}
            >
              <span>Prompt + Pairing</span>
              <strong>{selectedProfile ? labelForProfile(selectedProfile, usersById) : "Select agent"}</strong>
            </button>
            <button
              type="button"
              className={activeLeftTab === "create" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveLeftTab("create")}
            >
              <span>Agent/Event Creation</span>
              <strong>{dashboard?.stats?.totalPeople || 0} people</strong>
            </button>
            <button
              type="button"
              className={activeLeftTab === "history" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveLeftTab("history")}
            >
              <span>Debrief + Digests</span>
              <strong>{timelineDays.length} day history</strong>
            </button>
            <button
              type="button"
              className={activeLeftTab === "latest" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveLeftTab("latest")}
            >
              <span>Latest Agent Digests</span>
              <strong>{activeDigest ? formatDigestDay(activeDigest.iteration) : "No runs yet"}</strong>
            </button>
          </section>

          {activeLeftTab === "prompt" ? (
            <section className="simulation-stage">
              <aside className="panel inspector-panel">
                <div className="simulation-heading">
                  <div>
                    <div className="eyebrow">AUTONOMY LOOP</div>
                    <h2>PROMPT + PAIRING</h2>
                  </div>
                  <div className="simulation-day-card">
                    <span>Current Simulation Day</span>
                    <strong>{formatDigestDay(dashboard?.stats?.simulationDay || 0)}</strong>
                  </div>
                </div>

                <div className="simulation-grid">
                  <form className="story-card simulation-full-width" onSubmit={askAgent}>
                    <h3>Ask This Agent</h3>
                    <textarea
                      value={agentPrompt}
                      onChange={(event) => setAgentPrompt(event.target.value)}
                      placeholder="Ask anything about the full universe, or say something like: Create the agent Amina Yusuf, her goals are climate partnerships..."
                    />
                    <button disabled={busy === "agent-chat"} type="submit">
                      {busy === "agent-chat" ? "THINKING..." : "ASK / CREATE"}
                    </button>
                    {agentReplyMeta ? (
                      <div className="agent-reply-meta">
                        <span className={`agent-source-pill ${agentReplyMeta.source || "fallback"}`}>
                          {agentReplyMeta.source === "llm"
                            ? "LLM"
                            : agentReplyMeta.source === "app"
                              ? "APP ACTION"
                              : "FALLBACK"}
                        </span>
                        {agentReplyMeta.confidence ? (
                          <span className="agent-meta-pill">
                            {agentReplyMeta.confidence.toUpperCase()} CONFIDENCE
                          </span>
                        ) : null}
                        {agentReplyMeta.provider ? (
                          <span className="agent-meta-pill">
                            {agentReplyMeta.provider.toUpperCase()}
                          </span>
                        ) : null}
                        {agentReplyMeta.failedOver ? (
                          <span className="agent-meta-pill">FAILOVER USED</span>
                        ) : null}
                        {(agentReplyMeta.toolNames || []).map((toolName) => (
                          <span key={toolName} className="agent-meta-pill">
                            {toolName}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {agentReply ? <p className="highlight-paragraph">{agentReply}</p> : null}
                  </form>

                  <div className="story-card signal-card">
                    <h3>Selected Agent Signal</h3>
                    {signalPanel ? (
                      <>
                        <span className="signal-eyebrow">{signalPanel.eyebrow}</span>
                        <strong>{signalPanel.title}</strong>
                        <p>{signalPanel.about}</p>
                        {!!signalPanel.tags?.length && (
                          <div className="signal-tags">
                            {signalPanel.tags.map((tag) => (
                              <span key={tag} className="signal-tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="signal-iteration">
                          <span>{signalPanel.iterationLabel}</span>
                          <strong>{signalPanel.iterationMode}</strong>
                          <p>{signalPanel.iterationSummary}</p>
                        </div>
                        <span className="signal-meta">{signalPanel.meta}</span>
                      </>
                    ) : (
                      <p>Click a profile or event in the graph to inspect it here.</p>
                    )}
                  </div>

                  <div className="story-card">
                    <h3>Selected Event</h3>
                    {selectedEvent ? (
                      <>
                        <p>{selectedEvent.title}</p>
                        <p>{selectedEvent.description}</p>
                        <div className="chip-row">
                          {selectedEvent.tags.map((tag) => (
                            <span key={tag} className="chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p>{formatDate(selectedEvent.startAt)} · {selectedEvent.location}</p>
                      </>
                    ) : (
                      <p>No event selected.</p>
                    )}
                  </div>

                  <div className="story-card">
                    <h3>Selected Profile</h3>
                    {selectedProfile ? (
                      <>
                        <p>{labelForProfile(selectedProfile, usersById)}</p>
                        <p>{selectedProfile.bio || selectedProfile.memorySummary}</p>
                        <p>Goals: {(selectedProfile.goals || []).join(", ") || "n/a"}</p>
                        <p>Looking for: {(selectedProfile.lookingFor || []).join(", ") || "n/a"}</p>
                      </>
                    ) : (
                      <p>No profile selected.</p>
                    )}
                  </div>

                  <div className="story-card">
                    <h3>Telegram Link</h3>
                    <p>
                      {telegramStatus?.enabled
                        ? `Bot @${telegramStatus.username} is configured.`
                        : "Telegram bot is not configured in this environment."}
                    </p>
                    {selectedTelegramConnection ? (
                      <p>
                        Connected to Telegram user{" "}
                        {selectedTelegramConnection.username
                          ? `@${selectedTelegramConnection.username}`
                          : selectedTelegramConnection.firstName || selectedTelegramConnection.telegramUserId}
                        .
                      </p>
                    ) : (
                      <p>No Telegram account linked to this profile yet.</p>
                    )}
                    {telegramStatus?.webhookInfo?.url ? (
                      <p>
                        Webhook:{" "}
                        {telegramStatus.webhookInfo.url === telegramStatus.expectedWebhook
                          ? "configured"
                          : "needs refresh"}
                      </p>
                    ) : (
                      <p>Webhook is not registered yet.</p>
                    )}
                    {telegramStatus?.webhookInfo?.last_error_message ? (
                      <p>Last webhook error: {telegramStatus.webhookInfo.last_error_message}</p>
                    ) : null}
                    <div className="chip-row">
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={!selectedProfileId || busy === "telegram-connect"}
                        onClick={connectTelegram}
                      >
                        {busy === "telegram-connect" ? "GENERATING..." : "CONNECT TELEGRAM"}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={!telegramStatus?.enabled || busy === "telegram-setup"}
                        onClick={setupTelegramWebhook}
                      >
                        {busy === "telegram-setup" ? "SETTING UP..." : "REPAIR WEBHOOK"}
                      </button>
                    </div>
                    {telegramLink?.deepLink ? (
                      <>
                        <p>
                          Reconnect by opening this fresh one-time bot link for{" "}
                          {selectedProfile ? labelForProfile(selectedProfile, usersById) : "this profile"}{" "}
                          before {formatDate(telegramLink.expiresAt)}:
                        </p>
                        <p className="highlight-paragraph">{telegramLink.deepLink}</p>
                      </>
                    ) : null}
                  </div>

                  <div className="story-card simulation-full-width">
                    <h3>Latest Pairing Output</h3>
                    {recommendations.length ? (
                      <>
                        <p className="highlight-paragraph">{matchNarrative}</p>
                        {recommendations.map((item) => (
                          <div key={item.id} className="match-card">
                            <strong>
                              #{item.rank} {item.name}
                            </strong>
                            <span>{item.affiliation}</span>
                            <span>{item.reason}</span>
                            <span>score {item.score}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p>No match run yet. Pick an event and profile, then run agent pairing.</p>
                    )}
                  </div>
                </div>
              </aside>
            </section>
          ) : null}

          {localError ? <p className="error-line">{localError}</p> : null}

          {activeLeftTab === "create" ? (
            <section className="control-grid">
              <form className="panel form-panel" onSubmit={createProfileAgent}>
                <h2>CREATE PROFILE AGENT</h2>
                <label>
                  Name
                  <input
                    value={profileForm.name}
                    onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  Email
                  <input
                    value={profileForm.email}
                    onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label>
                  Affiliation
                  <input
                    value={profileForm.affiliation}
                    onChange={(event) => setProfileForm((current) => ({ ...current, affiliation: event.target.value }))}
                  />
                </label>
                <label>
                  Bio
                  <textarea
                    value={profileForm.bio}
                    onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
                  />
                </label>
                <label>
                  Interests
                  <input
                    value={profileForm.interestsText}
                    onChange={(event) => setProfileForm((current) => ({ ...current, interestsText: event.target.value }))}
                  />
                </label>
                <label>
                  Goals
                  <input
                    value={profileForm.goalsText}
                    onChange={(event) => setProfileForm((current) => ({ ...current, goalsText: event.target.value }))}
                  />
                </label>
                <label>
                  Looking for
                  <input
                    value={profileForm.lookingForText}
                    onChange={(event) => setProfileForm((current) => ({ ...current, lookingForText: event.target.value }))}
                  />
                </label>
                <label>
                  Preferences
                  <input
                    value={profileForm.preferencesText}
                    onChange={(event) => setProfileForm((current) => ({ ...current, preferencesText: event.target.value }))}
                  />
                </label>
                <button disabled={busy === "profile"} type="submit">
                  {busy === "profile" ? "CREATING..." : "CREATE PROFILE AGENT"}
                </button>
              </form>

              <form className="panel form-panel" onSubmit={createEvent}>
                <h2>CREATE EVENT AGENT</h2>
                <label>
                  Community
                  <input
                    value={eventForm.communityName}
                    onChange={(event) => setEventForm((current) => ({ ...current, communityName: event.target.value }))}
                  />
                </label>
                <label>
                  Title
                  <input
                    value={eventForm.title}
                    onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={eventForm.description}
                    onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>
                <label>
                  Start
                  <input
                    type="datetime-local"
                    value={eventForm.startAt}
                    onChange={(event) => setEventForm((current) => ({ ...current, startAt: event.target.value }))}
                  />
                </label>
                <label>
                  Location
                  <input
                    value={eventForm.location}
                    onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))}
                  />
                </label>
                <label>
                  Tags
                  <input
                    value={eventForm.tagsText}
                    onChange={(event) => setEventForm((current) => ({ ...current, tagsText: event.target.value }))}
                  />
                </label>
                <button disabled={busy === "event"} type="submit">
                  {busy === "event" ? "CREATING..." : "CREATE EVENT AGENT"}
                </button>
              </form>
            </section>
          ) : null}

          {activeLeftTab === "history" ? (
            <section className="memory-grid">
              <div className="panel ledger-panel">
                <div className="simulation-heading">
                  <div>
                    <div className="eyebrow">DAY-BY-DAY HISTORY</div>
                    <h2>DIGESTS AND DEBRIEFS</h2>
                  </div>
                  <div className="simulation-day-card">
                    <span>Visible History</span>
                    <strong>{timelineDays.length} days</strong>
                  </div>
                </div>
                <div className="history-frame">
                  {timelineDays.length ? (
                    timelineDays.map((day) => (
                      <div key={day.day} className="timeline-day">
                        <div className="timeline-day-header">
                          <strong>{formatDigestDay(day.day)}</strong>
                          <span className="timeline-meta">
                            {day.digests.length} digest{day.digests.length === 1 ? "" : "s"} · {day.debriefs.length} debrief{day.debriefs.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="timeline-day-body">
                          {day.digests.map((digest) => (
                            <div key={digest.id} className="timeline-card digest">
                              <span className="timeline-label">{digest.modeLabel || "Autonomous Run"}</span>
                              <p>{digest.summary}</p>
                              {!!digest.people?.length && <span className="timeline-meta">People: {joinNames(digest.people)}</span>}
                              {!!digest.events?.length && <span className="timeline-meta">Events: {joinNames(digest.events, "title")}</span>}
                              {!!digest.communities?.length && <span className="timeline-meta">Communities: {joinNames(digest.communities)}</span>}
                              {!!digest.actions?.length && <span className="timeline-meta">Next: {digest.actions.join(" ")}</span>}
                            </div>
                          ))}
                          {day.debriefs.map((debrief) => (
                            <div key={debrief.id} className="timeline-card debrief">
                              <span className="timeline-label">Debrief</span>
                              <p>{buildDebriefSummary(debrief)}</p>
                              <span className="timeline-meta">{formatDate(debrief.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No history yet. Advance the simulation and save a debrief to start a day-by-day record.</p>
                  )}
                </div>
              </div>

              <div className="panel ledger-panel">
                <h2>LIVE MEMORY SNAPSHOT</h2>
                {(dashboard?.profileMemory || []).slice(-4).reverse().map((memory) => (
                  <div key={memory.id} className="ledger-row">
                    <strong>{memory.memoryType}</strong>
                    <span>{memory.content}</span>
                  </div>
                ))}
                {(dashboard?.interactionMemory || []).slice(-4).reverse().map((memory) => (
                  <div key={memory.id} className="ledger-row">
                    <strong>{memory.followUpState}</strong>
                    <span>{memory.summary}</span>
                  </div>
                ))}
                {events.slice(0, 4).map((event) => (
                  <div key={event.id} className="ledger-row">
                    <strong>{event.title}</strong>
                    <span>{event.attendeeCount} attendees</span>
                    <span>{formatDate(event.startAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {activeLeftTab === "latest" ? (
            <>
              <section className="simulation-stage">
                <aside className="panel inspector-panel">
                  <div className="simulation-heading">
                    <div>
                      <div className="eyebrow">AUTONOMY LOOP</div>
                      <h2>LATEST AGENT DIGESTS</h2>
                    </div>
                    <div className="simulation-day-card">
                      <span>Current Simulation Day</span>
                      <strong>{formatDigestDay(dashboard?.stats?.simulationDay || 0)}</strong>
                    </div>
                  </div>
                  <div className="simulation-grid">
                    <div className="story-card latest-debrief-card">
                      <h3>Latest Debrief</h3>
                      {latestDebrief ? (
                        <>
                          <div className="chip-row">
                            <span className="chip">{formatDigestDay(latestDebrief.simulationDay || 0)}</span>
                            <span className="chip">Debrief</span>
                          </div>
                          <p className="highlight-paragraph">
                            {labelForProfile(latestDebriefProfile || selectedProfile || { userId: "" }, usersById)} met{" "}
                            {(latestDebrief.metPeople || []).map((person) => person.name).join(", ") || "no one recorded"}.
                            {" "}Usefulness was {latestDebrief.usefulnessRating}/5. {latestDebrief.notes}
                          </p>
                          <span>{formatDate(latestDebrief.createdAt)}</span>
                        </>
                      ) : (
                        <p>No debrief stored yet for this focused agent.</p>
                      )}
                    </div>

                    <div className="story-card latest-debrief-card simulation-full-width">
                      <h3>Latest Agent Digest</h3>
                      {activeDigest ? (
                        <>
                          <p className="highlight-paragraph">{activeDigest.summary}</p>
                          <div className="chip-row">
                            <span className="chip">{formatDigestDay(activeDigest.iteration)}</span>
                            <span className="chip">{activeDigest.modeLabel || "Autonomous Run"}</span>
                          </div>
                          {activeDigest.people?.length ? (
                            <p>
                              <strong>People found:</strong> {joinNames(activeDigest.people)}
                            </p>
                          ) : null}
                          {activeDigest.events?.length ? (
                            <p>
                              <strong>Events found:</strong> {joinNames(activeDigest.events, "title")}
                            </p>
                          ) : null}
                          {activeDigest.communities?.length ? (
                            <p>
                              <strong>Communities explored:</strong> {joinNames(activeDigest.communities)}
                            </p>
                          ) : null}
                          {activeDigest.actions?.length ? (
                            <div className="digest-actions">
                              {activeDigest.actions.map((action) => (
                                <span key={action}>{action}</span>
                              ))}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p>No autonomous run yet. Click “Advance Day” to simulate background work.</p>
                      )}
                    </div>
                  </div>
                </aside>
              </section>

              <section className="panel directory-panel">
                <div className="directory-hero">
                  <div>
                    <div className="eyebrow">UMOJA FEATURE MOCKUP</div>
                    <h2>WHO WE MEET</h2>
                    <p className="muted-copy">
                      A scrollable directory that changes with the active simulation day and current digest.
                    </p>
                  </div>
                  <div className="directory-stats">
                    <span className="directory-pill">Directory {filteredDirectoryEntries.length}</span>
                    <span className="directory-pill">Active Day {dashboard?.stats?.simulationDay || 0}</span>
                    <span className="directory-pill">Reminders {filteredDirectoryEntries.reduce((sum, entry) => sum + entry.todoCount, 0)}</span>
                  </div>
                </div>

                <input
                  className="directory-search"
                  value={directoryQuery}
                  onChange={(event) => setDirectoryQuery(event.target.value)}
                  placeholder="Search by name, company, or tag..."
                />

                <div className="directory-list">
                  {filteredDirectoryEntries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className="directory-card"
                      onClick={() => {
                        setSelectedProfileId(entry.profileAgentId);
                        setActiveLeftTab("prompt");
                      }}
                    >
                      <div className="directory-avatar">{entry.name.slice(0, 1)}</div>
                      <div className="directory-main">
                        <strong>{entry.name}</strong>
                        <span>{entry.affiliation || "Independent"}</span>
                        <span className="activity-line">{entry.activityLine}</span>
                        <span>{entry.bio}</span>
                        {entry.activityScore > 0 ? (
                          <span className="directory-day-badge">{formatDigestDay(activeDigest?.iteration || dashboard?.stats?.simulationDay || 0)}</span>
                        ) : null}
                        <div className="directory-tags">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="directory-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="directory-meta">
                        <span>{formatRelativeDate(entry.lastSeenAt)}</span>
                        <span>{entry.lastSeenLabel}</span>
                        <span>{entry.noteCount} notes</span>
                        <span>{entry.todoCount} todo</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>

        <aside className="dashboard-right">
          <section className="universe-stage">
            <div className="panel galaxy-panel">
              <div className="panel-heading">
                <div>
                  <h2>PIXEL UNIVERSE</h2>
                  <p className="muted-copy">Profiles orbit the selected event; gold links show recommended matches.</p>
                </div>
                <div className="selector-row">
                  <label>
                    Event agent
                    <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>
                      {events.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Profile agent
                    <select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}>
                      {eventProfiles.map((item) => (
                        <option key={item.id} value={item.id}>
                          {labelForProfile(item, usersById)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <GraphCanvas
                dashboard={dashboard}
                selectedEventId={selectedEventId}
                selectedProfileId={selectedProfileId}
                recommendations={recommendations}
                usersById={usersById}
                onSelectEvent={setSelectedEventId}
                onSelectProfile={setSelectedProfileId}
              />
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
