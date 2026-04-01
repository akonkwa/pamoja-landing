"use client";

import { useEffect, useMemo, useState } from "react";
import Workspace from "./Workspace";

async function callJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export default function AppShell() {
  const [session, setSession] = useState(null);
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [oauthMessage, setOauthMessage] = useState("");

  async function refreshSession() {
    setLoading(true);
    try {
      const nextSession = await callJson("/api/auth/session");
      setSession(nextSession);
      const state = await callJson("/api/network").catch(() => null);
      setNetwork(state);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("linkedin_connected");
    const linkedinError = params.get("linkedin_error");
    if (connected) {
      setOauthMessage("LinkedIn authorization returned to PAMOJA. Refresh diagnostics to load the captured connection state.");
    }
    if (linkedinError) {
      setError(decodeURIComponent(linkedinError));
    }
    refreshSession();
  }, []);

  const api = useMemo(
    () => ({
      callJson,
      refreshSession,
      setNetwork,
    }),
    []
  );

  if (loading) {
    return <div className="shell-loading">BOOTING PAMOJA...</div>;
  }

  return (
    <Workspace
      session={session || { authenticated: false, provider: null, username: "guest" }}
      network={network}
      setNetwork={setNetwork}
      error={oauthMessage || error}
      api={api}
    />
  );
}
