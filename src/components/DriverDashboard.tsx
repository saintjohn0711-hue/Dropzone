"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  DRIVER_STORAGE_KEY,
  type Driver,
  type DriverRankTier,
  type DriverReview,
  type DriverStatus,
} from "@/lib/drivers";
import {
  localGetByEmail,
  localGetDriverProfile,
  localSetStatus,
} from "@/lib/drivers-local";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DriverDashboard() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [reviews, setReviews] = useState<DriverReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");

  const applyProfile = useCallback(
    (next: Driver, nextReviews: DriverReview[], local: boolean, hint?: string) => {
      setDriver(next);
      setReviews(nextReviews.slice(0, 3));
      setLocalMode(local);
      localStorage.setItem(DRIVER_STORAGE_KEY, next.id);
      setNote(hint || (local ? t.driverLocalNote : null));
    },
    [t.driverLocalNote],
  );

  const loadById = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/drivers/${id}`);
        const json = await res.json();
        if (res.ok && json.ok) {
          applyProfile(
            json.driver,
            json.reviews ?? [],
            false,
            json.hint,
          );
          return;
        }
        const local = localGetDriverProfile(id);
        if (local) {
          applyProfile(local.driver, local.reviews, true);
          return;
        }
        setError(json.hint ? `${json.error}\n${json.hint}` : json.error);
        setDriver(null);
        setReviews([]);
      } catch {
        const local = localGetDriverProfile(id);
        if (local) {
          applyProfile(local.driver, local.reviews, true);
        } else {
          setError(t.driverLoadError);
          setDriver(null);
          setReviews([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [applyProfile, t.driverLoadError],
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
        await loadById(json.driver.id);
        return;
      }
      const local = localGetByEmail(lookupEmail);
      if (local) {
        const profile = localGetDriverProfile(local.id);
        if (profile) applyProfile(profile.driver, profile.reviews, true);
      } else {
        setError(
          json.hint
            ? `${json.error}\n${json.hint}`
            : json.error || t.driverNotFound,
        );
        setDriver(null);
      }
    } catch {
      const local = localGetByEmail(lookupEmail);
      if (local) {
        const profile = localGetDriverProfile(local.id);
        if (profile) applyProfile(profile.driver, profile.reviews, true);
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
        setDriver({ ...driver, ...json.driver });
      } else if (res.status === 503 || json.hint) {
        const updated = localSetStatus(driver.id, status);
        if (updated) {
          setDriver(updated);
          setLocalMode(true);
          setNote(t.driverLocalNote);
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
        setNote(t.driverLocalNote);
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

  function tierLabel(tier: DriverRankTier | undefined) {
    if (tier === "elite") return t.driverTierElite;
    if (tier === "gold") return t.driverTierGold;
    if (tier === "silver") return t.driverTierSilver;
    return t.driverTierBronze;
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
  const tier = (driver.rank_tier ?? "bronze") as DriverRankTier;
  const drives = driver.drives_completed ?? 0;
  const rating = driver.rating_avg ?? 0;
  const position = driver.rank_position ?? "—";
  const area = driver.rank_area || t.driverRankAreaDefault;

  return (
    <div className="driver-dashboard">
      {note ? <p className="driver-note">{note}</p> : null}

      <div className="driver-profile-card">
        <div className="driver-avatar">🚐</div>
        <div className="driver-profile-main">
          <h2 className="driver-name">{driver.name}</h2>
          <p className="driver-email">{driver.email}</p>
          <div className="driver-pill-row">
            <span
              className={`driver-status-pill ${isActive ? "active" : "inactive"}`}
              data-status={driver.status}
            >
              {isActive ? t.driverStatusActive : t.driverStatusInactive}
            </span>
            <span className={`driver-rank-badge tier-${tier}`}>
              {tierLabel(tier)}
            </span>
          </div>
        </div>
      </div>

      <div className="driver-rank-banner">
        <div className="driver-rank-pos">#{position}</div>
        <div>
          <strong>{t.driverRankTitle}</strong>
          <p>
            {t.driverRankIn} {area} · {t.driverScore} {driver.rank_score ?? 0}
          </p>
        </div>
      </div>

      <div className="driver-stats-row" aria-label={t.driverStats}>
        <div className="driver-stat">
          <div className="driver-stat-value">{drives}</div>
          <div className="driver-stat-label">{t.driverDrivesCompleted}</div>
        </div>
        <div className="driver-stat">
          <div className="driver-stat-value">
            {rating ? rating.toFixed(1) : "—"}
            <span className="driver-stat-star">★</span>
          </div>
          <div className="driver-stat-label">{t.driverAvgRating}</div>
        </div>
        <div className="driver-stat">
          <div className={`driver-stat-value tier-text-${tier}`}>
            {tierLabel(tier)}
          </div>
          <div className="driver-stat-label">{t.driverRankTier}</div>
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

      <section className="driver-reviews">
        <div className="driver-reviews-head">
          <h3>{t.driverBestReviews}</h3>
          <span>{t.driverTopQuotes}</span>
        </div>
        {reviews.length === 0 ? (
          <p className="driver-reviews-empty">{t.driverNoReviews}</p>
        ) : (
          reviews.map((r) => (
            <blockquote key={r.id} className="driver-review-card">
              <div className="driver-review-top">
                <span className="driver-review-stars">
                  {"★".repeat(Math.round(r.rating))}
                  <span className="driver-review-rating">
                    {Number(r.rating).toFixed(1)}
                  </span>
                </span>
                <cite>{r.customer_first_name}</cite>
              </div>
              <p>“{r.quote}”</p>
            </blockquote>
          ))
        )}
      </section>

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
