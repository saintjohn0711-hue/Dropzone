"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  clearStoredCustomerSession,
  customerAuthHeaders,
  getStoredCustomerId,
  getStoredCustomerToken,
} from "@/lib/customer-session-client";
import {
  localAddJobsite,
  localGetCustomer,
  localRemoveJobsite,
  type LocalJobsite,
} from "@/lib/customers-local";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Jobsite = { id: string; label: string; address: string; created_at?: string };

export function CustomerAccount() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customer, setCustomer] = useState<{
    id: string;
    email: string;
    name: string | null;
  } | null>(null);
  const [jobsites, setJobsites] = useState<Jobsite[]>([]);
  const [localMode, setLocalMode] = useState(false);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const token = getStoredCustomerToken();
    const id = getStoredCustomerId();
    if (!token && !id) {
      setCustomer(null);
      return;
    }

    if (token?.startsWith("local-") || searchParams.get("local") === "1") {
      const local = id ? localGetCustomer(id) : null;
      if (local) {
        setCustomer({ id: local.id, email: local.email, name: local.name });
        setJobsites(local.jobsites);
        setLocalMode(true);
        setMsg(t.customerLocalNote);
        return;
      }
    }

    try {
      const res = await fetch("/api/customers/me", {
        headers: customerAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setCustomer(json.customer);
        setJobsites(json.jobsites || []);
        setLocalMode(false);
        if (json.hint) setMsg(json.hint);
        return;
      }
      if (id) {
        const local = localGetCustomer(id);
        if (local) {
          setCustomer({ id: local.id, email: local.email, name: local.name });
          setJobsites(local.jobsites);
          setLocalMode(true);
          setMsg(t.customerLocalNote);
          return;
        }
      }
      setCustomer(null);
      setError(json.error || t.customerLoginError);
    } catch {
      if (id) {
        const local = localGetCustomer(id);
        if (local) {
          setCustomer({ id: local.id, email: local.email, name: local.name });
          setJobsites(local.jobsites);
          setLocalMode(true);
          setMsg(t.customerLocalNote);
          return;
        }
      }
      setCustomer(null);
    }
  }, [searchParams, t.customerLocalNote, t.customerLoginError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addJobsite(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || !address.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (localMode) {
        const site = localAddJobsite(customer.id, label, address);
        if (site) setJobsites((prev) => [site as LocalJobsite, ...prev]);
        setLabel("");
        setAddress("");
        return;
      }
      const res = await fetch("/api/customers/jobsites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...customerAuthHeaders(),
        },
        body: JSON.stringify({ label, address }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setJobsites((prev) => [json.jobsite, ...prev]);
        setLabel("");
        setAddress("");
      } else if (json.softLocal) {
        const site = localAddJobsite(customer.id, label, address);
        if (site) {
          setJobsites((prev) => [site, ...prev]);
          setLocalMode(true);
          setMsg(t.customerLocalNote);
          setLabel("");
          setAddress("");
        }
      } else {
        setError(json.error || t.customerJobsiteError);
      }
    } catch {
      setError(t.customerJobsiteError);
    } finally {
      setBusy(false);
    }
  }

  async function removeJobsite(id: string) {
    if (!customer) return;
    if (localMode) {
      localRemoveJobsite(customer.id, id);
      setJobsites((prev) => prev.filter((j) => j.id !== id));
      return;
    }
    await fetch(`/api/customers/jobsites?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: customerAuthHeaders(),
    });
    setJobsites((prev) => prev.filter((j) => j.id !== id));
  }

  async function logout() {
    try {
      await fetch("/api/customers/logout", {
        method: "POST",
        headers: customerAuthHeaders(),
      });
    } catch {
      /* ignore */
    }
    clearStoredCustomerSession();
    router.push("/account/login");
  }

  function useJobsite(site: Jobsite) {
    try {
      localStorage.setItem("dz-checkout-address", site.address);
      localStorage.setItem("dz-checkout-jobsite-label", site.label);
    } catch {
      /* ignore */
    }
    router.push("/checkout");
  }

  if (!customer) {
    return (
      <div className="driver-form">
        <h2 className="driver-form-title">{t.customerAccountTitle}</h2>
        <p className="driver-form-lead">{t.customerMustLogin}</p>
        {error ? <p className="driver-error">{error}</p> : null}
        <Link
          href="/account/login"
          className="driver-submit"
          style={{ display: "block", textAlign: "center", textDecoration: "none" }}
        >
          {t.customerSignIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      {msg ? <p className="driver-note">{msg}</p> : null}

      <div className="driver-profile-card">
        <div className="driver-avatar">🏗️</div>
        <div className="driver-profile-main">
          <h2 className="driver-name">{customer.name || t.customerAccountTitle}</h2>
          <p className="driver-email">{customer.email}</p>
        </div>
      </div>

      <div className="admin-quick" style={{ marginBottom: 16 }}>
        <Link href="/account/orders">{t.customerOrderHistory} →</Link>
        <Link href="/cart">{t.yourCart} →</Link>
      </div>

      <section className="driver-jobs">
        <div className="driver-reviews-head">
          <h3>{t.customerJobsites}</h3>
        </div>

        <form className="soft-card" onSubmit={addJobsite} style={{ marginBottom: 12 }}>
          <label className="driver-label">
            {t.customerJobsiteLabel}
            <input
              className="driver-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t.customerJobsiteLabelPh}
            />
          </label>
          <label className="driver-label">
            {t.checkoutAddress}
            <input
              className="driver-input"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.customerJobsiteAddressPh}
            />
          </label>
          <button type="submit" className="driver-submit" disabled={busy}>
            {t.customerSaveJobsite}
          </button>
        </form>

        {jobsites.length === 0 ? (
          <p className="driver-reviews-empty">{t.customerJobsitesEmpty}</p>
        ) : (
          jobsites.map((site) => (
            <div key={site.id} className="driver-job-card">
              <div className="driver-job-top">
                <strong>{site.label}</strong>
              </div>
              <p>{site.address}</p>
              <div className="driver-job-actions">
                <button
                  type="button"
                  className="driver-submit"
                  style={{ marginTop: 0 }}
                  onClick={() => useJobsite(site)}
                >
                  {t.customerUseJobsite}
                </button>
                <button
                  type="button"
                  className="driver-logout"
                  style={{ marginTop: 0 }}
                  onClick={() => removeJobsite(site.id)}
                >
                  {t.customerRemoveJobsite}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {error ? <p className="driver-error">{error}</p> : null}

      <button type="button" className="driver-logout" onClick={logout}>
        {t.customerLogout}
      </button>
    </div>
  );
}
