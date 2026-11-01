"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminFetch,
  getStoredAdminToken,
  setStoredAdminToken,
} from "@/lib/admin/client";
import { DEMO_ADMIN } from "@/lib/admin/constants";

type AuthMode = {
  mode: "env" | "demo";
  loginEmailHint: string;
  label: string | null;
};

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  useEffect(() => {
    if (getStoredAdminToken()) {
      router.replace("/admin");
      return;
    }
    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((j) => {
        if (j.authMode) {
          setAuthMode(j.authMode);
          if (j.authMode.mode === "demo") {
            setEmail(DEMO_ADMIN.email);
          } else {
            setEmail(j.authMode.loginEmailHint || "");
          }
        }
      })
      .catch(() => setAuthMode(null));
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Login failed");
        setBusy(false);
        return;
      }
      setStoredAdminToken(json.token);
      router.replace("/admin");
    } catch {
      setError("Login failed");
      setBusy(false);
    }
  }

  function fillDemo() {
    setEmail(DEMO_ADMIN.email);
    setPassword(DEMO_ADMIN.password);
  }

  return (
    <div className="admin-login-wrap">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <div className="admin-login-brand">
          <span className="admin-mark lg">DZ</span>
          <h1>DropZone Admin</h1>
          <p>Account management & control</p>
        </div>

        {authMode?.mode === "demo" ? (
          <div className="admin-banner warn">
            <strong>{DEMO_ADMIN.label}</strong>
            <p>
              Set <code>ADMIN_EMAIL</code> + <code>ADMIN_PASSWORD_HASH</code> on
              Vercel dropzone for production control. Demo:{" "}
              <code>{DEMO_ADMIN.email}</code>
            </p>
            <button type="button" className="admin-link-btn" onClick={fillDemo}>
              Fill test admin →
            </button>
          </div>
        ) : null}

        <label className="admin-label">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="admin-label">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="admin-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
