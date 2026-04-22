"use client";

import { useEffect, useMemo, useState } from "react";
import Workspace from "./Workspace";

async function callJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: options.cache || "no-store",
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
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refreshDashboard() {
    setLoading(true);
    try {
      const nextDashboard = await callJson("/api/dashboard");
      setDashboard(nextDashboard);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDashboard();
  }, []);

  const api = useMemo(
    () => ({
      callJson,
      refreshDashboard,
      setDashboard,
    }),
    []
  );

  if (loading && !dashboard) {
    return <div className="shell-loading">BOOTING UMOJA UNIVERSE...</div>;
  }

  return <Workspace dashboard={dashboard} setDashboard={setDashboard} api={api} error={error} />;
}
