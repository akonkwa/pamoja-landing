"use client";

import { useState } from "react";

export default function AuthView({ session, api, error }) {
  const [mode, setMode] = useState(session?.hasUser ? "login" : "setup");
  const [username, setUsername] = useState(session?.username || "akonkwa");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [localError, setLocalError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setWorking(true);
    setLocalError("");
    try {
      await api.callJson(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      await api.refreshSession();
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="eyebrow">PAMOJA / NETWORK INTELLIGENCE / LOCAL MVP</div>
        <h1>PAMOJA</h1>
        <p className="lead">
          A stripped-down retro workspace for exploring the hidden clusters and bridge people inside
          your LinkedIn history.
        </p>

        <form onSubmit={submit} className="auth-form">
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button disabled={working || !password}>
            {working ? "PROCESSING..." : mode === "setup" ? "CREATE LOCAL ACCESS" : "ENTER WORKSPACE"}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="auth-actions">
          <a className="auth-link-button" href="/auth/login?connection=linkedin">
            CONTINUE WITH LINKEDIN VIA AUTH0
          </a>
        </div>
        <p className="muted-copy">
          This uses Auth0 Universal Login. Configure Auth0 plus a LinkedIn social connection, then
          return here and sign in with LinkedIn instead of storing credentials in this app.
        </p>

        <div className="auth-switch">
          {session?.hasUser ? (
            <button className="link-button" onClick={() => setMode(mode === "login" ? "setup" : "login")}>
              {mode === "login" ? "Need to reset local access?" : "Back to login"}
            </button>
          ) : null}
        </div>

        {(localError || error) && <p className="error-line">{localError || error}</p>}
      </section>
    </main>
  );
}
