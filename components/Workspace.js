"use client";

import { useEffect, useMemo, useState } from "react";
import GraphCanvas from "./GraphCanvas";

const defaultQuestion = "What hidden clusters and bridges should I notice first?";
const sampleImport = `{
  "profile": {
    "name": "LinkedIn User",
    "headline": "Operator building across networks",
    "location": "Boston"
  },
  "people": [
    {
      "name": "Maya Coleman",
      "firstSeenYear": 2020,
      "cluster": "Climate Operators",
      "primaryRole": "Operator",
      "organization": "CityBridge",
      "topic": "climate systems",
      "interactionFrequency": 0.82,
      "messageHistory": 0.61,
      "engagementOverlap": 0.74,
      "mutualConnections": 11,
      "recency": 0.9,
      "sharedInstitutions": 1
    }
  ]
}`;

export default function Workspace({ session, network, setNetwork, api, error }) {
  const [linkedinStatus, setLinkedinStatus] = useState(null);
  const [linkedinProfile, setLinkedinProfile] = useState(null);
  const [question, setQuestion] = useState(defaultQuestion);
  const [insightAnswer, setInsightAnswer] = useState("");
  const [importText, setImportText] = useState("");
  const [weightDraft, setWeightDraft] = useState(network?.preferences || {});
  const [busy, setBusy] = useState("");
  const [localError, setLocalError] = useState(error || "");
  const [linkedinMessage, setLinkedinMessage] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [activity, setActivity] = useState(null);
  const [vaultData, setVaultData] = useState(null);

  useEffect(() => {
    api.callJson("/api/linkedin/status").then(setLinkedinStatus).catch(() => null);
    api.callJson("/api/linkedin/profile").then(setLinkedinProfile).catch(() => null);
    api.callJson("/api/debug/activity").then(setActivity).catch(() => null);
    api.callJson("/api/vault").then(setVaultData).catch(() => null);
  }, [api]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      api.callJson("/api/debug/activity").then(setActivity).catch(() => null);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [api]);

  useEffect(() => {
    setWeightDraft(network?.preferences || {});
  }, [network]);

  const years = useMemo(() => {
    if (!network?.timeline?.length) {
      return [];
    }
    return network.timeline.map((entry) => entry.year);
  }, [network]);

  async function loadDemo() {
    setBusy("demo");
    setLocalError("");
    try {
      const data = await api.callJson("/api/network/demo", { method: "POST" });
      setNetwork(data);
      setInsightAnswer("");
      setWizardStep(3);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function importLinkedIn() {
    setBusy("import");
    setLocalError("");
    try {
      const parsed = JSON.parse(importText);
      const data = await api.callJson("/api/linkedin/import", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
      setNetwork(data);
      setLinkedinMessage({
        title: "LinkedIn data imported",
        body:
          data.people?.length > 2
            ? `Imported ${data.people.length} people into the PAMOJA graph.`
            : `Imported ${data.people?.length || 0} person into the PAMOJA graph. The app is stable, but you will need more people for a meaningful cluster and bridge view.`,
        env: [],
      });
      setWizardStep(3);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    setBusy("ask");
    setLocalError("");
    try {
      const data = await api.callJson("/api/insights/query", {
        method: "POST",
        body: JSON.stringify({ question }),
      });
      setInsightAnswer(data.answer);
      const refreshed = await api.callJson("/api/network");
      setNetwork(refreshed);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function launchOfficialLinkedIn() {
    setBusy("oauth");
    setLocalError("");
    try {
      const data = await api.callJson("/api/linkedin/official/start");
      if (data.authUrl) {
        setWizardStep(2);
        window.location.href = data.authUrl;
        return;
      }
      setLinkedinMessage({
        title: "LinkedIn auth not ready",
        body: "The app did not receive an authorization URL from the direct LinkedIn OAuth bootstrap.",
        env: [],
      });
    } catch (err) {
      setLinkedinMessage({
        title: "LinkedIn connect not configured",
        body: err.message,
        env: [
          "LINKEDIN_CLIENT_ID",
          "LINKEDIN_CLIENT_SECRET",
          "LINKEDIN_REDIRECT_URI",
          "LINKEDIN_SCOPE",
        ],
      });
    } finally {
      setBusy("");
    }
  }

  async function saveWeights() {
    setBusy("weights");
    setLocalError("");
    try {
      const next = await api.callJson("/api/network/weights", {
        method: "POST",
        body: JSON.stringify(weightDraft),
      });
      setNetwork(next);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function refreshDiagnostics() {
    setBusy("refresh");
    try {
      const profileData = await api.callJson("/api/linkedin/profile");
      if (profileData?.connected) {
        await api.callJson("/api/linkedin/sync", { method: "POST" }).catch(() => null);
      }
      const [activityData, vaultResponse, nextNetwork] = await Promise.all([
        api.callJson("/api/debug/activity"),
        api.callJson("/api/vault"),
        api.callJson("/api/network"),
      ]);
      setLinkedinProfile(profileData);
      setActivity(activityData);
      setVaultData(vaultResponse);
      setNetwork(nextNetwork);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  function updateWeightDraft(key, value) {
    setWeightDraft((current) => ({
      ...current,
      [key]: Number(value),
    }));
  }

  async function logout() {
    setBusy("disconnect");
    try {
      await api.callJson("/api/linkedin/disconnect", { method: "POST" });
      await refreshDiagnostics();
      setLinkedinMessage({
        title: "LinkedIn disconnected",
        body: "The direct LinkedIn connection was removed from local encrypted storage.",
        env: [],
      });
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <div className="eyebrow">PAMOJA / LINKEDIN PAST VIEW / LOCAL-FIRST</div>
          <h1>PAMOJA</h1>
          <p className="muted-copy">
            Safe LinkedIn mode: direct provider OAuth stores LinkedIn data locally on this machine,
            imports stay user-consented, and the explore canvas now leads the workspace from the upper right.
          </p>
        </div>
        <div className="topbar-actions">
          <span className="pill">APP ACCESS OPEN</span>
          <span className="pill">{session.provider ? session.provider.toUpperCase() : "NO LINKEDIN SESSION"}</span>
          <span className="pill">{network?.importSource ? network.importSource.toUpperCase() : "NO DATA"}</span>
          {linkedinProfile?.connected ? (
            <button className="ghost-button" onClick={logout}>
              DISCONNECT LINKEDIN
            </button>
          ) : null}
        </div>
      </header>

      <section className="workspace-layout">
        <div className="left-rail">
          <div className="panel import-panel safe-panel">
            <div className="panel-heading">
              <h2>SAFE IMPORT WIZARD</h2>
              <span className="muted-copy">official login first, first-party import second</span>
            </div>
            <div className="wizard-steps">
              <button
                className={`wizard-step ${wizardStep === 1 ? "active-step" : ""}`}
                onClick={() => setWizardStep(1)}
                type="button"
              >
                1. Connect safely
              </button>
              <button
                className={`wizard-step ${wizardStep === 2 ? "active-step" : ""}`}
                onClick={() => setWizardStep(2)}
                type="button"
              >
                2. Import your data
              </button>
              <button
                className={`wizard-step ${wizardStep === 3 ? "active-step" : ""}`}
                onClick={() => setWizardStep(3)}
                type="button"
              >
                3. Explore the graph
              </button>
            </div>
          <p className="muted-copy">
            App login is disabled for now. Use direct LinkedIn OAuth to connect safely, or use the
            assisted import JSON path from your own exported data.
          </p>
          <div className="status-block">
            <div>Direct LinkedIn OAuth: {linkedinStatus?.officialApiConfigured ? "configured" : "not configured"}</div>
            <div>Assisted import: {linkedinStatus?.assistedImportAvailable ? "available" : "off"}</div>
            {linkedinStatus?.redirectUri ? <div>Redirect URI: {linkedinStatus.redirectUri}</div> : null}
            <div>LinkedIn session: {linkedinProfile?.connected ? "connected" : "not connected"}</div>
          </div>
          <div className="button-row">
            <button
              className="ghost-button"
              onClick={launchOfficialLinkedIn}
              disabled={busy === "oauth" || !linkedinStatus}
              type="button"
            >
              {busy === "oauth" ? "CHECKING..." : "CONNECT LINKEDIN DIRECTLY"}
            </button>
            <button onClick={loadDemo} disabled={busy === "demo"}>
              {busy === "demo" ? "LOADING..." : "LOAD DEMO MODE"}
            </button>
            <button className="ghost-button" onClick={() => setImportText(sampleImport)} type="button">
              LOAD IMPORT TEMPLATE
            </button>
            <button className="ghost-button" onClick={refreshDiagnostics} disabled={busy === "refresh"} type="button">
              {busy === "refresh" ? "REFRESHING..." : "REFRESH DIAGNOSTICS"}
            </button>
          </div>
          <div className="year-row">
            <span className="year-chip">no scraping</span>
            <span className="year-chip">no background crawling</span>
            <span className="year-chip">manual refresh only</span>
          </div>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder='Paste JSON with "profile" and "people" or "connections" here'
          />
          <button onClick={importLinkedIn} disabled={busy === "import" || !importText.trim()}>
            {busy === "import" ? "IMPORTING..." : "IMPORT LINKEDIN DATA"}
          </button>
          </div>

          <div className="panel control-panel">
            <h2>LINKEDIN RETRIEVAL</h2>
            {linkedinProfile?.connected ? (
              <div className="story-list">
                <div className="story-card">
                  <h3>Connected profile</h3>
                  <p>{linkedinProfile.profile?.name || linkedinProfile.profile?.email || "Unknown user"}</p>
                  <p>{linkedinProfile.profile?.email || "No email available"}</p>
                </div>
              <div className="story-card">
                <h3>Token status</h3>
                <p>
                  {linkedinProfile.token?.present
                    ? "Direct LinkedIn access token stored locally."
                    : "No LinkedIn connection token available yet."}
                </p>
                  {linkedinProfile.token?.expiresAt ? (
                    <p>Expires at: {new Date(linkedinProfile.token.expiresAt).toLocaleString()}</p>
                  ) : null}
                  {linkedinProfile.tokenError ? <p>{linkedinProfile.tokenError}</p> : null}
                </div>
              </div>
            ) : (
              <p className="muted-copy">
                No LinkedIn profile is connected yet. Use the direct LinkedIn button above to connect LinkedIn
                and then return here.
              </p>
            )}
          </div>

          <div className="panel control-panel">
            <h2>RELATIONSHIP WEIGHTS</h2>
            <div className="slider-grid">
              {Object.entries(weightDraft || {}).map(([key, value]) => (
                <label key={key}>
                  <span>{key}</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={value}
                    onChange={(event) => updateWeightDraft(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="button-row">
              <button onClick={saveWeights} disabled={busy === "weights"} type="button">
                {busy === "weights" ? "SAVING..." : "SAVE WEIGHTS"}
              </button>
              <button
                className="ghost-button"
                onClick={() => setWeightDraft(network?.preferences || {})}
                type="button"
              >
                RESET
              </button>
            </div>
            <div className="year-row">
              {years.map((year) => (
                <span key={year} className="year-chip">
                  {year}
                </span>
              ))}
            </div>
          </div>

          <div className="panel control-panel">
            <div className="panel-heading">
              <h2>SYSTEM CONSOLE</h2>
              <span className="muted-copy">verbose background activity</span>
            </div>
            <div className="console-list">
              {(activity?.events || []).slice(0, 8).map((entry, index) => (
                <div key={`${entry.ts}-${entry.event}-${index}`} className="history-item console-item">
                  <strong>{entry.event}</strong>
                  <span>{new Date(entry.ts).toLocaleString()}</span>
                  <pre>{JSON.stringify(entry.details || {}, null, 2)}</pre>
                </div>
              ))}
              {!activity?.events?.length ? (
                <div className="history-item console-item">
                  <strong>idle</strong>
                  <span>No background events captured yet.</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="panel control-panel">
            <div className="panel-heading">
              <h2>RETRIEVAL VAULT</h2>
              <span className="muted-copy">what PAMOJA actually received</span>
            </div>
            <div className="story-list">
              <div className="story-card">
                <h3>Current state</h3>
                <pre>{JSON.stringify(vaultData?.state || {}, null, 2)}</pre>
              </div>
              <div className="story-card">
                <h3>Latest provider snapshot</h3>
                <pre>{JSON.stringify(vaultData?.providerSnapshots?.[0]?.payload || { note: "No provider snapshot yet" }, null, 2)}</pre>
              </div>
              <div className="story-card">
                <h3>Latest raw import</h3>
                <pre>{JSON.stringify(vaultData?.rawImports?.[0]?.payload || { note: "No raw import captured yet" }, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>

        <div className="right-stage">
          <div className="panel graph-panel graph-priority">
            <div className="panel-heading">
              <h2>FREE EXPLORE CANVAS</h2>
              <span className="muted-copy">upper-right stage / fast pan / zoom / hover / reactive timeline</span>
            </div>
            <GraphCanvas network={network} />
          </div>

          <div className="panel story-panel">
            <div className="panel-heading">
              <h2>STORY MODE</h2>
              <span className="muted-copy">auto-generated narrative + persistent insight memory</span>
            </div>

            <div className="story-list">
              {(network?.story || []).map((entry) => (
                <article key={entry.title} className="story-card">
                  <h3>{entry.title}</h3>
                  <p>{entry.body}</p>
                </article>
              ))}
            </div>

            <form onSubmit={askQuestion} className="insight-form">
              <label>
                Ask PAMOJA
                <textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
              </label>
              <button disabled={busy === "ask"}>{busy === "ask" ? "THINKING..." : "ASK AGENT"}</button>
            </form>

            {insightAnswer ? (
              <div className="agent-answer">
                <h3>Latest Answer</h3>
                <p>{insightAnswer}</p>
              </div>
            ) : null}

            <div className="history">
              <h3>Memory</h3>
              {(network?.conversation || []).slice().reverse().slice(0, 4).map((entry) => (
                <div key={entry.id} className="history-item">
                  <strong>Q:</strong> {entry.question}
                  <br />
                  <strong>A:</strong> {entry.answer}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {(localError || error) && <p className="error-line">{localError || error}</p>}
      {linkedinMessage ? (
        <section className="panel status-panel">
          <div className="panel-heading">
            <h2>{linkedinMessage.title}</h2>
            <button className="ghost-button" onClick={() => setLinkedinMessage(null)} type="button">
              CLOSE
            </button>
          </div>
          <p className="muted-copy">{linkedinMessage.body}</p>
          {linkedinMessage.env?.length ? (
            <div className="year-row">
              {linkedinMessage.env.map((item) => (
                <span key={item} className="year-chip">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {linkedinMessage.auth0Dashboard?.length ? (
            <div className="story-list">
              {linkedinMessage.auth0Dashboard.map((item) => (
                <div key={item} className="history-item">
                  {item}
                </div>
              ))}
            </div>
          ) : null}
          <p className="muted-copy">
            Configure these in `.env.local`, restart the app, and then retry direct LinkedIn connection.
          </p>
        </section>
      ) : null}
    </main>
  );
}
