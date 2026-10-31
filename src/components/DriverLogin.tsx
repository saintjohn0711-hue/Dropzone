"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DRIVER_STORAGE_KEY } from "@/lib/drivers";
import { DRIVER_SESSION_STORAGE } from "@/lib/driver-session-client";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DriverLogin() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/drivers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(
          json.hint ? `${json.error}\n${json.hint}` : json.error || t.driverLoginError,
        );
        setBusy(false);
        return;
      }
      if (json.token) {
        localStorage.setItem(DRIVER_SESSION_STORAGE, json.token);
      }
      if (json.driver?.id) {
        localStorage.setItem(DRIVER_STORAGE_KEY, json.driver.id);
      }
      router.push(`/driver/dashboard?id=${json.driver.id}`);
    } catch {
      setError(t.driverLoginError);
      setBusy(false);
    }
  }

  return (
    <form className="driver-form" onSubmit={onSubmit}>
      <h2 className="driver-form-title">{t.driverLoginTitle}</h2>
      <p className="driver-form-lead">{t.driverLoginLead}</p>

      <label className="driver-label">
        {t.driverEmail}
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
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
