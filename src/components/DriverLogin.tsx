"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DRIVER_STORAGE_KEY } from "@/lib/drivers";
import { DRIVER_SESSION_STORAGE } from "@/lib/driver-session-client";
import { TEST_DRIVER } from "@/lib/test-driver";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DriverLogin() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ensuring, setEnsuring] = useState(false);

  useEffect(() => {
    // Best-effort: ensure demo driver row exists in DropZone Supabase
    void fetch("/api/drivers/ensure-test", { method: "POST" }).catch(() => null);
  }, []);

  async function loginWithEmail(nextEmail: string) {
    setBusy(true);
    setError(null);
    try {
      // Ensure test account exists when using the demo email
      if (nextEmail.trim().toLowerCase() === TEST_DRIVER.email) {
        setEnsuring(true);
        await fetch("/api/drivers/ensure-test", { method: "POST" }).catch(() => null);
        setEnsuring(false);
      }

      const res = await fetch("/api/drivers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(
          json.hint ? `${json.error}\n${json.hint}` : json.error || t.driverLoginError,
        );
        setBusy(false);
        return;
      }
      if (json.driver?.id) {
        localStorage.setItem(DRIVER_STORAGE_KEY, json.driver.id);
      }
      // Prefer real session token; if driver_sessions SQL not applied, use soft local- id token
      if (json.token && json.persisted !== false) {
        localStorage.setItem(DRIVER_SESSION_STORAGE, json.token);
      } else if (json.driver?.id) {
        localStorage.setItem(DRIVER_SESSION_STORAGE, `local-${json.driver.id}`);
      } else if (json.token) {
        localStorage.setItem(DRIVER_SESSION_STORAGE, json.token);
      }
      router.push(`/driver/dashboard?id=${json.driver.id}`);
    } catch {
      setError(t.driverLoginError);
      setBusy(false);
      setEnsuring(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginWithEmail(email);
  }

  function useTestAccount() {
    setEmail(TEST_DRIVER.email);
    void loginWithEmail(TEST_DRIVER.email);
  }

  return (
    <form className="driver-form" onSubmit={onSubmit}>
      <h2 className="driver-form-title">{t.driverLoginTitle}</h2>
      <p className="driver-form-lead">{t.driverLoginLead}</p>

      <div className="driver-test-hint">
        <strong>{t.driverTryTest}</strong>
        <p>
          {t.driverEmail}: <code>{TEST_DRIVER.email}</code>
          <br />
          {TEST_DRIVER.passwordNote}
        </p>
        <button
          type="button"
          className="driver-test-btn"
          disabled={busy || ensuring}
          onClick={useTestAccount}
        >
          {t.driverUseTestAccount}
        </button>
      </div>

      <label className="driver-label">
        {t.driverEmail}
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={TEST_DRIVER.email}
          autoComplete="email"
        />
      </label>

      {error ? (
        <p className="driver-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="driver-submit" disabled={busy}>
        {busy ? t.driverLoggingIn : t.driverLoginCta}
      </button>

      <p className="driver-form-foot">
        {t.driverNeedAccount}{" "}
        <Link href="/driver">{t.driverCreateAccount}</Link>
      </p>
      <p className="driver-note" style={{ marginTop: 12 }}>
        {t.driverLoginApproach}
      </p>
    </form>
  );
}
