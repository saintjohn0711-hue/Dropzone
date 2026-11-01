"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CUSTOMER_ID_STORAGE,
  CUSTOMER_SESSION_STORAGE,
} from "@/lib/customer-session-client";
import {
  DEMO_CUSTOMER,
  localUpsertCustomer,
} from "@/lib/customers-local";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function CustomerLogin() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loginWithEmail(nextEmail: string, nextName?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/customers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: nextEmail,
          name: nextName || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.customer?.id) {
        localStorage.setItem(CUSTOMER_ID_STORAGE, json.customer.id);
        if (json.token && json.persisted !== false) {
          localStorage.setItem(CUSTOMER_SESSION_STORAGE, json.token);
        } else {
          localStorage.setItem(
            CUSTOMER_SESSION_STORAGE,
            `local-${json.customer.id}`,
          );
        }
        router.push("/account");
        return;
      }

      // Soft local account when SQL not applied
      if (json.softLocal || res.status === 503) {
        const local = localUpsertCustomer({
          email: nextEmail,
          name: nextName || DEMO_CUSTOMER.name,
        });
        localStorage.setItem(CUSTOMER_ID_STORAGE, local.id);
        localStorage.setItem(CUSTOMER_SESSION_STORAGE, `local-${local.id}`);
        router.push("/account?local=1");
        return;
      }

      setError(
        json.hint ? `${json.error}\n${json.hint}` : json.error || t.customerLoginError,
      );
      setBusy(false);
    } catch {
      const local = localUpsertCustomer({
        email: nextEmail,
        name: nextName || null,
      });
      localStorage.setItem(CUSTOMER_ID_STORAGE, local.id);
      localStorage.setItem(CUSTOMER_SESSION_STORAGE, `local-${local.id}`);
      router.push("/account?local=1");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginWithEmail(email, name);
  }

  function useDemo() {
    setEmail(DEMO_CUSTOMER.email);
    setName(DEMO_CUSTOMER.name);
    void loginWithEmail(DEMO_CUSTOMER.email, DEMO_CUSTOMER.name);
  }

  return (
    <form className="driver-form" onSubmit={onSubmit}>
      <h2 className="driver-form-title">{t.customerLoginTitle}</h2>
      <p className="driver-form-lead">{t.customerLoginLead}</p>

      <div className="driver-test-hint">
        <strong>{t.customerTryDemo}</strong>
        <p>
          {t.driverEmail}: <code>{DEMO_CUSTOMER.email}</code>
          <br />
          {DEMO_CUSTOMER.note}
        </p>
        <button
          type="button"
          className="driver-test-btn"
          disabled={busy}
          onClick={useDemo}
        >
          {t.customerUseDemo}
        </button>
      </div>

      <label className="driver-label">
        {t.customerName}
        <input
          className="driver-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.customerNamePlaceholder}
          autoComplete="name"
        />
      </label>

      <label className="driver-label">
        {t.driverEmail}
        <input
          className="driver-input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@jobsite.com"
          autoComplete="email"
        />
      </label>

      {error ? (
        <p className="driver-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="driver-submit" disabled={busy}>
        {busy ? t.customerSigningIn : t.customerSignIn}
      </button>

      <p className="driver-form-foot">
        <Link href="/">{t.keepBrowsing}</Link>
      </p>
    </form>
  );
}
