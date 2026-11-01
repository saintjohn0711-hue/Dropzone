"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/client";

type DriverRow = {
  id: string;
  name: string;
  display_name?: string | null;
  email: string;
  phone?: string | null;
  status: string;
  application_status?: string | null;
  vehicle_type: string;
  vehicle_detail?: string | null;
  service_area?: string | null;
  created_at: string;
};

export function AdminDrivers() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [appStatus, setAppStatus] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (appStatus) params.set("application_status", appStatus);
    if (vehicle) params.set("vehicle_type", vehicle);
    try {
      const res = await adminFetch(`/api/admin/drivers?${params}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to load drivers");
        setDrivers([]);
      } else {
        setDrivers(json.drivers || []);
        setHint(json.hint || null);
      }
    } catch {
      setError("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }, [q, status, appStatus, vehicle]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin-page">
      <h1 className="admin-h1">Drivers</h1>
      <p className="admin-lead">Search, filter, and review applications.</p>

      <div className="admin-filters">
        <input
          className="admin-input"
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="admin-input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All availability</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className="admin-input"
          value={appStatus}
          onChange={(e) => setAppStatus(e.target.value)}
        >
          <option value="">All applications</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          className="admin-input"
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
        >
          <option value="">All vehicles</option>
          <option value="car">Car</option>
          <option value="suv">SUV</option>
          <option value="pickup">Pickup</option>
          <option value="van">Van</option>
          <option value="box_truck">Box truck</option>
          <option value="drone">Drone</option>
        </select>
        <button type="button" className="admin-primary sm" onClick={load}>
          Refresh
        </button>
      </div>

      {hint ? <p className="admin-note">{hint}</p> : null}
      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Vehicle</th>
              <th>App</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>Loading…</td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={6}>No drivers found.</td>
              </tr>
            ) : (
              drivers.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.display_name || d.name}</strong>
                    {d.service_area ? (
                      <div className="admin-cell-sub">{d.service_area}</div>
                    ) : null}
                  </td>
                  <td>{d.email}</td>
                  <td>{d.vehicle_type}</td>
                  <td>
                    <span className={`admin-pill soft ${d.application_status || "pending"}`}>
                      {d.application_status || "pending"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-pill ${d.status === "active" ? "on" : "off"}`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/drivers/${d.id}`} className="admin-row-link">
                      Open →
                    </Link>
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
