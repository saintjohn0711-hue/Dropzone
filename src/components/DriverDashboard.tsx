"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  DRIVER_STORAGE_KEY,
  type Driver,
  type DriverStatus,
} from "@/lib/drivers";
import {
  localGetByEmail,
  localGetDriver,
  localSetStatus,
} from "@/lib/drivers-local";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DriverDashboard() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");

  const loadById = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/drivers/${id}`);
        const json = await res.json();
        if (res.ok && json.ok) {
          setDriver(json.driver);
          setLocalMode(false);
          localStorage.setItem(DRIVER_STORAGE_KEY, json.driver.id);
          return;
        }
        const local = localGetDriver(id);
        if (local) {
          setDriver(local);
          setLocalMode(true);
          localStorage.setItem(DRIVER_STORAGE_KEY, local.id);
          return;
        }
        setError(json.hint ? `${json.error}\n${json.hint}` : json.error);
        setDriver(null);
      } catch {
        const local = localGetDriver(id);
        if (local) {
          setDriver(local);
          setLocalMode(true);
        } else {
          setError(t.driverLoadError);
          setDriver(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [t.driverLoadError],
  );

  useEffect(() => {
    const fromQuery = searchParams.get("id");
    const fromStorage =
      typeof window !== "undefined"
        ? localStorage.getItem(DRIVER_STORAGE_KEY)
        : null;
    const id = fromQuery || fromStorage;
    if (searchParams.get("local") === "1") setLocalMode(true);
    if (id) void loadById(id);
    else {
      setLoading(false);
      setDriver(null);
    }
  }, [searchParams, loadById]);

  async function lookup() {
    if (!lookupEmail.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/drivers?email=${encodeURIComponent(lookupEmail.trim().toLowerCase())}`,
      );
      const json = await res.json();
      if (res.ok && json.ok && json.driver) {
        setDriver(json.driver);
        setLocalMode(false);
        localStorage.setItem(DRIVER_STORAGE_KEY, json.driver.id);
      } else {
        const local = localGetByEmail(lookupEmail);
        if (local) {
          setDriver(local);
          setLocalMode(true);
          localStorage.setItem(DRIVER_STORAGE_KEY, local.id);
        } else {
          setError(
            json.hint
              ? `${json.error}\n${json.hint}`
              : json.error || t.driverNotFound,
          );
          setDriver(null);
        }
      }
    } catch {
      const local = localGetByEmail(lookupEmail);
      if (local) {
        setDriver(local);
        setLocalMode(true);
      } else {
        setError(t.driverLoadError);
      }
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(status: DriverStatus) {
    if (!driver || toggling) return;
    setToggling(true);
    setError(null);
    try {
      if (localMode) {
        const updated = localSetStatus(driver.id, status);
        if (updated) setDriver(updated);
        return;
      }
      const res = await fetch(`/api/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setDriver(json.driver);
      } else if (res.status === 503 || json.hint) {
        const updated = localSetStatus(driver.id, status);
        if (updated) {
          setDriver(updated);
          setLocalMode(true);
        } else {
          setError(json.error);
        }
      } else {
        setError(json.hint ? `${json.error}\n${json.hint}` : json.error);
      }
    } catch {
      const updated = localSetStatus(driver.id, status);
      if (updated) {
        setDriver(updated);
        setLocalMode(true);
      } else {
        setError(t.driverLoadError);
      }
    } finally {
      setToggling(false);
    }
  }

  function vehicleLabel(type: string) {
    if (type === "car") return t.vehicleCar;
    if (type === "pickup") return t.vehiclePickup;
    if (type === "box_truck") return t.vehicleBox;
    if (type === "drone") return t.vehicleDrone;
    return type;
  }

  if (loading) {
    return <p className="empty-state">{t.driverLoading}</p>;
  }

  if (!driver) {
    return (
      <div className="driver-form">
        <h2 className="driver-form-title">{t.driverDashboardTitle}</h2>
        <p className="driver-form-lead">{t.driverLookupLead}</p>
        <label className="driver-label">
          {t.driverEmail}
          <input
            type="email"
            value={lookupEmail}
            onChange={(e) => setLookupEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </label>
        {error ? (
          <p className="driver-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" className="driver-submit" onClick={lookup}>
          {t.driverOpenDashboard}
        </button>
        <p className="driver-form-foot">
          {t.driverNeedAccount}{" "}
          <Link href="/driver">{t.driverCreateAccount}</Link>
        </p>
      </div>
    );
  }

  const isActive = driver.status === "active";

  return (
    <div className="driver-dashboard">
      {localMode ? <p className="driver-note">{t.driverLocalNote}</p> : null}

      <div className="driver-profile-card">
        <div className="driver-avatar">🚐</div>
        <div>
          <h2 className="driver-name">{driver.name}</h2>
          <p className="driver-email">{driver.email}</p>
          <span
            className={`driver-status-pill ${isActive ? "active" : "inactive"}`}
            data-status={driver.status}
          >
            {isActive ? t.driverStatusActive : t.driverStatusInactive}
          </span>
        </div>
      </div>

      <div className="driver-meta">
        <div className="driver-meta-row">
          <span>{t.driverPhone}</span>
          <strong>{driver.phone || "—"}</strong>
        </div>
        <div className="driver-meta-row">
          <span>{t.driverVehicleType}</span>
          <strong>{vehicleLabel(driver.vehicle_type)}</strong>
        </div>
        <div className="driver-meta-row">
          <span>{t.driverVehicleDetail}</span>
          <strong>{driver.vehicle_detail || "—"}</strong>
        </div>
        <div className="driver-meta-row">
          <span>{t.driverLicense}</span>
          <strong>{driver.license_plate || "—"}</strong>
        </div>
      </div>

      <div className="driver-status-panel">
        <div>
          <h3>{t.driverAvailability}</h3>
          <p>{isActive ? t.driverActiveHint : t.driverInactiveHint}</p>
        </div>
        <button
          type="button"
          className={`driver-status-toggle ${isActive ? "on" : "off"}`}
          disabled={toggling}
          aria-pressed={isActive}
          onClick={() => setStatus(isActive ? "inactive" : "active")}
        >
          <span className="driver-toggle-knob" />
          <span className="driver-toggle-label">
            {isActive ? t.driverStatusActive : t.driverStatusInactive}
          </span>
        </button>
      </div>

      {error ? (
        <p className="driver-error" role="alert">
          {error}
        </p>
      ) : null}

      <Link href="/driver" className="driver-secondary-link">
        {t.driverCreateAnother}
      </Link>
    </div>
  );
}
