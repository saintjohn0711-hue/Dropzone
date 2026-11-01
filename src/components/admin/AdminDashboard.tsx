"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/client";

type Stats = {
  driversTotal: number;
  driversActive: number;
  driversPending: number;
  ordersOpen: number;
  ordersTotal: number;
  hints?: string[];
};

type StoreStatus = {
  connected: boolean;
  mode: string;
  label: string;
  message: string;
  envMissing?: string[];
};

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [hd, setHd] = useState<StoreStatus | null>(null);
  const [lw, setLw] = useState<StoreStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sRes, hRes] = await Promise.all([
        adminFetch("/api/admin/stats"),
        adminFetch("/api/admin/inventory/status"),
      ]);
      const sJson = await sRes.json();
      const hJson = await hRes.json();
      if (sRes.ok && sJson.ok) setStats(sJson.stats);
      else setError(sJson.error || "Could not load stats");
      if (hRes.ok && hJson.ok) {
        setHd(hJson.homeDepot);
        setLw(hJson.lowes);
      }
    } catch {
      setError("Could not load admin overview");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshInventory() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminFetch("/api/admin/inventory/refresh", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg(json.error || "Refresh failed");
      } else {
        setMsg(
          json.scrub?.message ||
            `Refreshed · persisted ${json.scrub?.persisted ?? 0}`,
        );
        if (json.homeDepot) setHd(json.homeDepot);
        if (json.lowes) setLw(json.lowes);
      }
    } catch {
      setMsg("Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <h1 className="admin-h1">Overview</h1>
      <p className="admin-lead">Drivers, orders, and inventory control.</p>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span>Drivers</span>
          <strong>{stats?.driversTotal ?? "—"}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Active</span>
          <strong>{stats?.driversActive ?? "—"}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Pending apps</span>
          <strong>{stats?.driversPending ?? "—"}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Open orders</span>
          <strong>{stats?.ordersOpen ?? "—"}</strong>
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Inventory control</h2>
          <button
            type="button"
            className="admin-primary sm"
            disabled={busy}
            onClick={refreshInventory}
          >
            {busy ? "Refreshing…" : "Refresh inventory"}
          </button>
        </div>
        {hd ? (
          <div className="admin-hd-row">
            <span className={`admin-pill ${hd.connected ? "on" : "off"}`}>
              {hd.connected ? "HD feed live" : "Connect HD"}
            </span>
            <p>
              <strong>{hd.label}</strong> — {hd.message}
            </p>
          </div>
        ) : (
          <p className="admin-muted">Loading Home Depot status…</p>
        )}
        {lw ? (
          <div className="admin-hd-row">
            <span className={`admin-pill ${lw.connected ? "on" : "off"}`}>
              {lw.connected ? "Lowe's feed live" : "Connect Lowe's"}
            </span>
            <p>
              <strong>{lw.label}</strong> — {lw.message}
            </p>
          </div>
        ) : (
          <p className="admin-muted">Loading Lowe&apos;s status…</p>
        )}
        {msg ? <p className="admin-note">{msg}</p> : null}
      </section>

      <section className="admin-panel">
        <h2>Quick links</h2>
        <div className="admin-quick">
          <Link href="/admin/drivers">Manage drivers →</Link>
          <Link href="/admin/orders">Manage orders →</Link>
          <a href="/" target="_blank" rel="noreferrer">
            Open customer app ↗
          </a>
        </div>
        {stats?.hints?.length ? (
          <p className="admin-muted">{stats.hints.join(" · ")}</p>
        ) : null}
      </section>
    </div>
  );
}
