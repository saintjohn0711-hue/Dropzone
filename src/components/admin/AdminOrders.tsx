"use client";

import { useCallback, useEffect, useState } from "react";
import { ORDER_STATUSES } from "@/lib/admin/constants";
import { adminFetch } from "@/lib/admin/client";

type OrderRow = {
  id: string;
  status: string;
  uiStatus?: string;
  total_cents?: number | null;
  currency?: string;
  delivery_address?: string | null;
  contact_name?: string | null;
  created_at: string;
};

export function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    try {
      const res = await adminFetch(`/api/admin/orders?${params}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to load orders");
        setOrders([]);
      } else {
        setOrders(json.orders || []);
      }
    } catch {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await adminFetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg(json.error || "Update failed");
      } else {
        setMsg(`Order ${id.slice(0, 8)}… → ${json.order.uiStatus || status}`);
        await load();
      }
    } catch {
      setMsg("Update failed");
    } finally {
      setBusyId(null);
    }
  }

  function money(cents?: number | null, currency = "USD") {
    if (cents == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  }

  return (
    <div className="admin-page">
      <h1 className="admin-h1">Orders</h1>
      <p className="admin-lead">
        Update status: placed → assigned → en route → delivered / canceled.
      </p>

      <div className="admin-filters">
        <select
          className="admin-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" className="admin-primary sm" onClick={load}>
          Refresh
        </button>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}
      {msg ? <p className="admin-note">{msg}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Contact / address</th>
              <th>Total</th>
              <th>Status</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Loading…</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5}>No orders yet.</td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <code>{o.id.slice(0, 8)}</code>
                    <div className="admin-cell-sub">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <strong>{o.contact_name || "—"}</strong>
                    <div className="admin-cell-sub">
                      {o.delivery_address || "—"}
                    </div>
                  </td>
                  <td>{money(o.total_cents, o.currency)}</td>
                  <td>
                    <span className="admin-pill soft">{o.uiStatus || o.status}</span>
                  </td>
                  <td>
                    <select
                      className="admin-input compact"
                      disabled={busyId === o.id}
                      value={o.uiStatus || o.status}
                      onChange={(e) => setStatus(o.id, e.target.value)}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
