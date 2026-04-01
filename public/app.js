const state = {
  dashboard: null,
  selectedEventId: null,
  selectedProfileAgentId: null,
};

const sampleCsv = `name,email,affiliation,bio,interests,goals,looking_for,preferences
Lina Park,lina@example.com,Northstar Labs,"Building tools for founder communities and event ops","community; founders; software","find pilot partners; meet operators","community builders; design partners","warm intros; practical builders"
Samuel Osei,samuel@example.com,CityBridge,"Runs urban resilience programs and public-private pilots","climate; cities; partnerships","find startups for pilots","founders; policy translators","clear use cases; operators"
Imani Cole,imani@example.com,Canvas Capital,"Investor exploring community software and workflow products","venture; community; workflow","meet strong founders; understand event intelligence","fundable teams; repeat builders","traction; focused conversations"`;

const els = {
  eventForm: document.querySelector("#event-form"),
  claimForm: document.querySelector("#claim-form"),
  recommendForm: document.querySelector("#recommend-form"),
  debriefForm: document.querySelector("#debrief-form"),
  claimEventSelect: document.querySelector("#claim-event-select"),
  claimProfileSelect: document.querySelector("#claim-profile-select"),
  exploreEventSelect: document.querySelector("#explore-event-select"),
  importEventSelect: document.querySelector("#import-event-select"),
  csvInput: document.querySelector("#csv-input"),
  loadSampleCsvButton: document.querySelector("#load-sample-csv"),
  importCsvButton: document.querySelector("#import-csv"),
  workflowGuidance: document.querySelector("#workflow-guidance"),
  profileProgressLabel: document.querySelector("#profile-progress-label"),
  exploreProgressLabel: document.querySelector("#explore-progress-label"),
  profileProgressBar: document.querySelector("#profile-progress-bar"),
  exploreProgressBar: document.querySelector("#explore-progress-bar"),
  workflowChips: document.querySelector("#workflow-chips"),
  attendanceBoard: document.querySelector("#attendance-board"),
  profileDirectory: document.querySelector("#profile-directory"),
  selectedProfileCard: document.querySelector("#selected-profile-card"),
  recommendations: document.querySelector("#recommendations"),
  metPeopleOptions: document.querySelector("#met-people-options"),
  activeEventSummary: document.querySelector("#active-event-summary"),
  timelineList: document.querySelector("#timeline-list"),
  timelineCount: document.querySelector("#timeline-count"),
  analyticsList: document.querySelector("#analytics-list"),
  toast: document.querySelector("#toast"),
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

function showToast(message) {
  els.toast.hidden = false;
  els.toast.textContent = message;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 2800);
}

function optionMarkup(value, label) {
  return `<option value="${value}">${label}</option>`;
}

function getEvents() {
  return state.dashboard?.events || [];
}

function getEventById(eventId) {
  return getEvents().find((event) => event.id === eventId) || null;
}

function getProfilesForEvent(eventId) {
  return (state.dashboard?.profileAgents || []).filter((agent) => agent.eventId === eventId);
}

function getAttendeesForEvent(eventId) {
  return (state.dashboard?.attendees || []).filter((attendee) => attendee.eventId === eventId);
}

function getUserByProfile(profileAgent) {
  return getAttendeesForEvent(profileAgent.eventId).find((attendee) => attendee.id === profileAgent.attendeeId) || null;
}

function getSelectedEventId() {
  return state.selectedEventId || getEvents()[0]?.id || "";
}

function getSelectedEvent() {
  return getEventById(getSelectedEventId());
}

function getSelectedProfile() {
  return getProfilesForEvent(getSelectedEventId()).find((profile) => profile.id === state.selectedProfileAgentId) || null;
}

function getRelationLabel(status) {
  if (status === "has_attended") {
    return "Has attended";
  }
  if (status === "attending") {
    return "Is attending";
  }
  return "Will attend";
}

function renderSelect(select, items, labelBuilder) {
  if (!items.length) {
    select.innerHTML = '<option value="">No options yet</option>';
    return;
  }

  select.innerHTML = items.map((item) => optionMarkup(item.id, labelBuilder(item))).join("");
}

function setSelectedEvent(eventId) {
  if (!eventId) {
    return;
  }

  state.selectedEventId = eventId;
  [els.claimEventSelect, els.exploreEventSelect, els.importEventSelect].forEach((select) => {
    if ([...select.options].some((option) => option.value === eventId)) {
      select.value = eventId;
    }
  });
}

function setSelectedProfile(profileAgentId) {
  state.selectedProfileAgentId = profileAgentId;
}

function pickDefaultProfile(eventId) {
  const profiles = getProfilesForEvent(eventId);
  return profiles.find((profile) => profile.draftStatus === "claimed") || profiles[0] || null;
}

function renderEventSelectors() {
  const events = getEvents();
  renderSelect(els.claimEventSelect, events, (event) => event.title);
  renderSelect(els.exploreEventSelect, events, (event) => event.title);
  renderSelect(els.importEventSelect, events, (event) => event.title);

  if (!state.selectedEventId && events.length) {
    state.selectedEventId = events[0].id;
  }

  setSelectedEvent(getSelectedEventId());
}

function renderClaimProfiles() {
  const profiles = getProfilesForEvent(els.claimEventSelect.value);
  renderSelect(els.claimProfileSelect, profiles, (profile) => {
    const attendee = getUserByProfile(profile);
    return `${attendee?.name || "Unknown"} (${profile.draftStatus})`;
  });

  const selectedProfile = profiles.find((profile) => profile.id === els.claimProfileSelect.value) || profiles[0];
  if (!selectedProfile) {
    els.claimForm.reset();
    return;
  }

  const attendee = getUserByProfile(selectedProfile);
  document.querySelector("#claim-name").value = attendee?.name || "";
  document.querySelector("#claim-email").value = attendee?.email || "";
  document.querySelector("#claim-affiliation").value = attendee?.affiliation || "";
  document.querySelector("#claim-bio").value = selectedProfile.bio || "";
  document.querySelector("#claim-interests").value = (selectedProfile.interests || []).join("; ");
  document.querySelector("#claim-goals").value = (selectedProfile.goals || []).join("; ");
  document.querySelector("#claim-looking-for").value = (selectedProfile.lookingFor || []).join("; ");
  document.querySelector("#claim-preferences").value = (selectedProfile.preferences || []).join("; ");
  document.querySelector("#claim-consent").checked = Boolean(selectedProfile.consentedMemory);
}

function renderAttendanceBoard() {
  const attendees = getAttendeesForEvent(getSelectedEventId());
  const groups = [
    ["has_attended", "Has attended"],
    ["attending", "Is attending"],
    ["will_attend", "Will attend"],
  ];

  els.attendanceBoard.innerHTML = groups
    .map(([status, label]) => {
      const matches = attendees.filter((attendee) => attendee.relationStatus === status);
      return `
        <article class="attendance-card">
          <span class="eyebrow">${label}</span>
          <h3>${matches.length}</h3>
          <p>${matches.map((attendee) => attendee.name).join(", ") || "No one yet."}</p>
        </article>
      `;
    })
    .join("");
}

function renderProfileDirectory() {
  const profiles = getProfilesForEvent(getSelectedEventId());

  if (!profiles.length) {
    els.profileDirectory.innerHTML = '<div class="empty-state">No profiles linked to this event yet.</div>';
    els.selectedProfileCard.innerHTML = '<div class="empty-state">Choose or create a profile to explore.</div>';
    return;
  }

  if (!profiles.some((profile) => profile.id === state.selectedProfileAgentId)) {
    state.selectedProfileAgentId = pickDefaultProfile(getSelectedEventId())?.id || profiles[0].id;
  }

  els.profileDirectory.innerHTML = profiles
    .map((profile) => {
      const attendee = getUserByProfile(profile);
      const isActive = profile.id === state.selectedProfileAgentId;
      return `
        <article class="profile-card ${isActive ? "active" : ""}" data-profile-id="${profile.id}">
          <span class="eyebrow">${getRelationLabel(attendee?.relationStatus)}</span>
          <h3>${attendee?.name || profile.id}</h3>
          <p class="profile-meta">${attendee?.affiliation || "Independent"}</p>
          <p class="profile-meta">${profile.bio || "No bio yet."}</p>
        </article>
      `;
    })
    .join("");

  [...els.profileDirectory.querySelectorAll(".profile-card")].forEach((card) => {
    card.addEventListener("click", () => {
      setSelectedProfile(card.dataset.profileId);
      renderExplorerDetails();
    });
  });
}

function renderSelectedProfileCard() {
  const profile = getSelectedProfile();

  if (!profile) {
    els.selectedProfileCard.innerHTML = '<div class="empty-state">Select a profile to inspect it.</div>';
    return;
  }

  const attendee = getUserByProfile(profile);
  els.selectedProfileCard.innerHTML = `
    <article class="selected-profile-card active">
      <span class="eyebrow">${getRelationLabel(attendee?.relationStatus)}</span>
      <h3>${attendee?.name || profile.id}</h3>
      <p class="profile-meta">${attendee?.affiliation || "Independent"}</p>
      <p class="profile-meta">${profile.bio || "No bio yet."}</p>
      <div class="badge-row">
        ${(profile.interests || []).slice(0, 4).map((item) => `<span class="badge">${item}</span>`).join("")}
      </div>
      <p class="profile-meta"><strong>Goals:</strong> ${(profile.goals || []).join(", ") || "None listed"}</p>
      <p class="profile-meta"><strong>Looking for:</strong> ${(profile.lookingFor || []).join(", ") || "None listed"}</p>
      <p class="profile-meta"><strong>Preferences:</strong> ${(profile.preferences || []).join(", ") || "None listed"}</p>
      <p class="profile-meta"><strong>Memory:</strong> ${profile.memorySummary || "No memory yet."}</p>
    </article>
  `;
}

function renderMetPeopleOptions() {
  const selectedProfile = getSelectedProfile();
  if (!selectedProfile) {
    els.metPeopleOptions.innerHTML = "";
    return;
  }

  els.metPeopleOptions.innerHTML = getProfilesForEvent(getSelectedEventId())
    .filter((profile) => profile.id !== selectedProfile.id)
    .map((profile) => {
      const attendee = getUserByProfile(profile);
      return `
        <label class="checkbox-pill">
          <input type="checkbox" value="${profile.id}" />
          <span>${attendee?.name || profile.id}</span>
        </label>
      `;
    })
    .join("");
}

function renderRecommendations(items = []) {
  if (!items.length) {
    els.recommendations.className = "recommendation-list empty-state";
    els.recommendations.textContent = "Recommendations will appear here for the selected profile.";
    return;
  }

  els.recommendations.className = "recommendation-list";
  els.recommendations.innerHTML = items
    .map(
      (item) => `
        <article class="recommendation-card">
          <span class="eyebrow">Rank ${item.rank}</span>
          <h3>${item.name}</h3>
          <p class="recommendation-meta">${item.affiliation || "Independent"} · score ${item.score}</p>
          <p class="recommendation-meta">${item.bio || "No bio yet."}</p>
          <div class="badge-row">
            <span class="badge">${item.reason}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderAnalytics() {
  const items = state.dashboard?.analytics || [];
  els.analyticsList.innerHTML = items.length
    ? items
        .slice(0, 12)
        .map(
          (item) => `
            <article class="analytics-card">
              <h3>${item.eventName}</h3>
              <p>${new Date(item.createdAt).toLocaleString()}</p>
            </article>
          `
        )
        .join("")
    : '<div class="empty-state">No analytics yet.</div>';
}

function renderTimeline() {
  const events = [...getEvents()].sort((left, right) => String(left.startAt || "").localeCompare(String(right.startAt || "")));
  els.timelineCount.textContent = `${events.length} events`;
  els.timelineList.innerHTML = events
    .map((event) => `
      <article class="timeline-item ${event.id === getSelectedEventId() ? "active" : ""}" data-event-id="${event.id}">
        <strong>${event.title}</strong>
        <p>${event.startAt ? new Date(event.startAt).toLocaleString() : "No time yet"}</p>
        <p>${event.attendeeCount} attendees · ${event.claimedCount} claimed</p>
      </article>
    `)
    .join("");

  [...els.timelineList.querySelectorAll(".timeline-item")].forEach((item) => {
    item.addEventListener("click", () => {
      setSelectedEvent(item.dataset.eventId);
      state.selectedProfileAgentId = pickDefaultProfile(item.dataset.eventId)?.id || null;
      renderAll();
    });
  });
}

function renderActiveEventSummary() {
  const event = getSelectedEvent();
  if (!event) {
    els.activeEventSummary.innerHTML = "<p>No event selected.</p>";
    return;
  }

  const eventAgent = (state.dashboard?.eventAgents || []).find((agent) => agent.eventId === event.id);
  els.activeEventSummary.innerHTML = `
    <span class="eyebrow">Currently selected event</span>
    <h3>${event.title}</h3>
    <p>${event.location || "Location TBD"} · ${event.attendeeCount} attendance links</p>
    <p>${eventAgent?.summary || event.description || "No summary yet."}</p>
    <div class="badge-row">
      ${(event.tags || []).map((tag) => `<span class="badge">${tag}</span>`).join("")}
    </div>
  `;
}

function setProgress(labelEl, barEl, done, total) {
  labelEl.textContent = `${done} / ${total}`;
  barEl.style.width = `${(done / total) * 100}%`;
}

function renderGuidance() {
  const event = getSelectedEvent();
  const profile = getSelectedProfile();
  const claimProfiles = getProfilesForEvent(els.claimEventSelect.value);
  const selectedClaimProfile = claimProfiles.find((item) => item.id === els.claimProfileSelect.value);
  const profileProgress = [
    Boolean(els.claimEventSelect.value),
    Boolean(els.claimProfileSelect.value),
    Boolean(selectedClaimProfile?.draftStatus === "claimed"),
    Boolean(profile),
  ].filter(Boolean).length;

  const exploreProgress = [
    Boolean(event),
    getAttendeesForEvent(getSelectedEventId()).length > 0,
    getProfilesForEvent(getSelectedEventId()).length > 0,
    Boolean(profile),
  ].filter(Boolean).length;

  setProgress(els.profileProgressLabel, els.profileProgressBar, profileProgress, 4);
  setProgress(els.exploreProgressLabel, els.exploreProgressBar, exploreProgress, 4);

  if (!selectedClaimProfile) {
    els.workflowGuidance.textContent = "Start in Workflow 1 by choosing an event and a draft profile. Once your profile is saved, move to Workflow 2 to explore the event universe.";
  } else if (selectedClaimProfile.draftStatus !== "claimed") {
    els.workflowGuidance.textContent = `You're preparing a profile for ${getEventById(els.claimEventSelect.value)?.title || "this event"}. Save it once, then use the explorer to browse events and agent profiles.`;
  } else {
    els.workflowGuidance.textContent = `Your profile is active. Workflow 2 is now the main surface: navigate events, inspect who has attended, is attending, or will attend, and open other profiles as agents.`;
  }

  els.workflowChips.innerHTML = [
    `<span class="chip ${profileProgress >= 3 ? "active" : ""}">profile setup</span>`,
    `<span class="chip ${exploreProgress >= 2 ? "active" : ""}">event explorer</span>`,
    `<span class="chip">event agents = attendance relations</span>`,
  ].join("");
}

function renderExplorerDetails() {
  renderAttendanceBoard();
  renderProfileDirectory();
  renderSelectedProfileCard();
  renderMetPeopleOptions();
  renderActiveEventSummary();
  renderTimeline();
  renderGuidance();
}

function renderAll() {
  renderEventSelectors();
  renderClaimProfiles();
  renderExplorerDetails();
  renderAnalytics();
}

async function refreshDashboard() {
  state.dashboard = await api("/api/dashboard");
  if (!state.selectedEventId && getEvents().length) {
    state.selectedEventId = getEvents()[0].id;
  }
  if (!state.selectedProfileAgentId) {
    state.selectedProfileAgentId = pickDefaultProfile(getSelectedEventId())?.id || null;
  }
  renderAll();
}

els.claimEventSelect.addEventListener("change", () => {
  setSelectedEvent(els.claimEventSelect.value);
  renderClaimProfiles();
  renderGuidance();
});

els.claimProfileSelect.addEventListener("change", renderClaimProfiles);

els.exploreEventSelect.addEventListener("change", () => {
  setSelectedEvent(els.exploreEventSelect.value);
  state.selectedProfileAgentId = pickDefaultProfile(getSelectedEventId())?.id || null;
  renderAll();
});

els.importEventSelect.addEventListener("change", () => {
  setSelectedEvent(els.importEventSelect.value);
  renderAll();
});

els.eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  payload.tags = String(payload.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  await api("/api/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  await refreshDashboard();
  state.selectedEventId = getEvents()[getEvents().length - 1].id;
  state.selectedProfileAgentId = pickDefaultProfile(state.selectedEventId)?.id || null;
  renderAll();
  showToast("Event created.");
  event.currentTarget.reset();
});

els.loadSampleCsvButton.addEventListener("click", () => {
  els.csvInput.value = sampleCsv;
});

els.importCsvButton.addEventListener("click", async () => {
  if (!els.csvInput.value.trim()) {
    showToast("Paste CSV rows or load the sample first.");
    return;
  }

  await api(`/api/events/${els.importEventSelect.value}/attendees/import`, {
    method: "POST",
    body: JSON.stringify({ csvText: els.csvInput.value }),
  });

  await refreshDashboard();
  setSelectedEvent(els.importEventSelect.value);
  state.selectedProfileAgentId = pickDefaultProfile(getSelectedEventId())?.id || null;
  renderAll();
  showToast("Attendees imported.");
});

els.claimForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!els.claimProfileSelect.value) {
    showToast("Choose a profile first.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  payload.consentedMemory = document.querySelector("#claim-consent").checked;

  await api(`/api/profile-agents/${els.claimProfileSelect.value}/claim`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  await refreshDashboard();
  setSelectedEvent(els.claimEventSelect.value);
  state.selectedProfileAgentId = els.claimProfileSelect.value;
  renderAll();
  showToast("Profile saved.");
});

els.recommendForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const profile = getSelectedProfile();
  if (!profile) {
    showToast("Select a profile in the explorer first.");
    return;
  }

  const payload = await api("/api/recommendations/query", {
    method: "POST",
    body: JSON.stringify({
      eventId: getSelectedEventId(),
      profileAgentId: profile.id,
      query: "Who should I meet at this event?",
    }),
  });

  renderRecommendations(payload.recommendations);
  await refreshDashboard();
  showToast("Recommendations generated.");
});

els.debriefForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const profile = getSelectedProfile();
  if (!profile) {
    showToast("Select a profile in the explorer first.");
    return;
  }

  const metProfileAgentIds = [...els.metPeopleOptions.querySelectorAll("input:checked")].map((input) => input.value);

  await api("/api/debriefs", {
    method: "POST",
    body: JSON.stringify({
      eventId: getSelectedEventId(),
      profileAgentId: profile.id,
      metProfileAgentIds,
      usefulnessRating: document.querySelector("#debrief-rating").value,
      notes: document.querySelector("#debrief-notes").value,
      followUp: document.querySelector("#debrief-follow-up").checked,
    }),
  });

  await refreshDashboard();
  showToast("Debrief saved.");
  event.currentTarget.reset();
});

refreshDashboard().catch((error) => {
  showToast(error.message);
});
