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
  payment_status?: string | null;
  assigned_driver_id?: string | null;
  created_at: string;
};

type ActiveDriver = {
  id: string;
  name: string;
  email: string;
  vehicle_type?: string;
};

export function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [drivers, setDrivers] = useState<ActiveDriver[]>([]);
  const [filter, setFilter] = useState("");
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});
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
      const [oRes, dRes] = await Promise.all([
        adminFetch(`/api/admin/orders?${params}`),
        adminFetch("/api/admin/dispatch"),
      ]);
      const oJson = await oRes.json();
      const dJson = await dRes.json();
      if (!oRes.ok || !oJson.ok) {
        setError(oJson.error || "Failed to load orders");
        setOrders([]);
      } else {
        setOrders(oJson.orders || []);
      }
      if (dRes.ok && dJson.ok) setDrivers(dJson.drivers || []);
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

  async function dispatch(orderId: string) {
    const driverId = assignMap[orderId];
    if (!driverId) {
      setMsg("Pick an active driver first");
      return;
    }
    setBusyId(orderId);
    setMsg(null);
    try {
      const res = await adminFetch("/api/admin/dispatch", {
        method: "POST",
        body: JSON.stringify({ orderId, driverId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg(json.hint ? `${json.error} — ${json.hint}` : json.error || "Dispatch failed");
      } else {
        setMsg(
          `Assigned ${orderId.slice(0, 8)}… → ${json.driver?.name || driverId}${
            json.hint ? ` (${json.hint})` : ""
          }`,
        );
        await load();
      }
    } catch {
      setMsg("Dispatch failed");
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

  function driverName(id?: string | null) {
    if (!id) return "—";
    return drivers.find((d) => d.id === id)?.name || id.slice(0, 8);
  }

  return (
    <div className="admin-page">
      <h1 className="admin-h1">Orders & dispatch</h1>
      <p className="admin-lead">
        Assign open orders to active drivers. Status: placed → assigned → en
        route → delivered / canceled.
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
        <span className="admin-muted">
          Active drivers: {drivers.length}
        </span>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}
      {msg ? <p className="admin-note">{msg}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Contact / address</th>
              <th>Pay</th>
              <th>Total</th>
              <th>Status</th>
              <th>Dispatch</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Loading…</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7}>No orders yet.</td>
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
                    <div className="admin-cell-sub">
                      Driver: {driverName(o.assigned_driver_id)}
                    </div>
                  </td>
                  <td>
                    <span className="admin-pill soft">
                      {o.payment_status || "—"}
                    </span>
                  </td>
                  <td>{money(o.total_cents, o.currency)}</td>
                  <td>
                    <span className="admin-pill soft">
                      {o.uiStatus || o.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-dispatch-cell">
                      <select
                        className="admin-input compact"
                        value={assignMap[o.id] || ""}
                        onChange={(e) =>
                          setAssignMap((m) => ({
                            ...m,
                            [o.id]: e.target.value,
                          }))
                        }
                        disabled={busyId === o.id || drivers.length === 0}
                      >
                        <option value="">
                          {drivers.length ? "Pick driver…" : "No active drivers"}
                        </option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.vehicle_type || "—"})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="admin-primary sm"
                        disabled={busyId === o.id || !assignMap[o.id]}
                        onClick={() => dispatch(o.id)}
                      >
                        Assign
                      </button>
                    </div>
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
