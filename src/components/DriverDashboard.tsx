"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  DRIVER_STORAGE_KEY,
  type Driver,
  type DriverRankTier,
  type DriverReview,
  type DriverStatus,
} from "@/lib/drivers";
import {
  authHeaders,
  clearStoredDriverToken,
  getStoredDriverToken,
} from "@/lib/driver-session-client";
import {
  localGetDriverProfile,
  localSetStatus,
} from "@/lib/drivers-local";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DriverDashboard() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [reviews, setReviews] = useState<DriverReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [jobs, setJobs] = useState<
    Array<{
      id: string;
      status: string;
      uiStatus?: string;
      delivery_address?: string | null;
      contact_name?: string | null;
      total_cents?: number | null;
      driver_accepted_at?: string | null;
      payment_status?: string | null;
      pod_captured_at?: string | null;
      pod_status?: string | null;
    }>
  >([]);
  const [jobsHint, setJobsHint] = useState<string | null>(null);
  const [jobBusy, setJobBusy] = useState<string | null>(null);
  const [podOrderId, setPodOrderId] = useState<string | null>(null);
  const [podPreview, setPodPreview] = useState<string | null>(null);
  const [podFileName, setPodFileName] = useState<string | null>(null);
  const [podNote, setPodNote] = useState<string | null>(null);

  const applyProfile = useCallback(
    (next: Driver, nextReviews: DriverReview[], local: boolean, hint?: string) => {
      setDriver(next);
      setReviews(nextReviews.slice(0, 3));
      setLocalMode(local);
      setAuthed(true);
      localStorage.setItem(DRIVER_STORAGE_KEY, next.id);
      setNote(hint || (local ? t.driverLocalNote : null));
    },
    [t.driverLocalNote],
  );

  const loadAuthed = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getStoredDriverToken();
    const idHint =
      searchParams.get("id") || localStorage.getItem(DRIVER_STORAGE_KEY);

    // Demo / soft session (no driver_sessions table yet, or offline local driver)
    if (token?.startsWith("local-") || searchParams.get("local") === "1") {
      const id = token?.startsWith("local-") ? token.slice(6) : idHint;
      if (id) {
        try {
          const profileRes = await fetch(`/api/drivers/${id}`);
          const profileJson = await profileRes.json();
          if (profileRes.ok && profileJson.ok) {
            applyProfile(
              profileJson.driver,
              profileJson.reviews ?? [],
              false,
              profileJson.hint || t.driverMustLoginSoft,
            );
            setLoading(false);
            return;
          }
        } catch {
          /* try local */
        }
        const local = localGetDriverProfile(id);
        if (local) {
          applyProfile(local.driver, local.reviews, true);
          setLoading(false);
          return;
        }
      }
      setAuthed(false);
      setDriver(null);
      setLoading(false);
      return;
    }

    if (!token) {
      // Soft allow: if SQL sessions missing but driver id known, load profile
      if (idHint) {
        try {
          const profileRes = await fetch(`/api/drivers/${idHint}`);
          const profileJson = await profileRes.json();
          if (profileRes.ok && profileJson.ok) {
            applyProfile(
              profileJson.driver,
              profileJson.reviews ?? [],
              false,
              t.driverMustLoginSoft,
            );
            setLoading(false);
            return;
          }
        } catch {
          /* fall through to login gate */
        }
      }
      setLoading(false);
      setAuthed(false);
      setDriver(null);
      return;
    }
    try {
      const res = await fetch("/api/drivers/me", { headers: authHeaders() });
      const json = await res.json();
      if (res.ok && json.ok && json.driver) {
        applyProfile(json.driver, json.reviews ?? [], false, json.hint);
        return;
      }
      if (res.status === 401) {
        clearStoredDriverToken();
        // Soft recovery: still have driver id from login
        if (idHint) {
          try {
            const profileRes = await fetch(`/api/drivers/${idHint}`);
            const profileJson = await profileRes.json();
            if (profileRes.ok && profileJson.ok) {
              applyProfile(
                profileJson.driver,
                profileJson.reviews ?? [],
                false,
                t.driverMustLoginSoft,
              );
              return;
            }
          } catch {
            /* fall through */
          }
        }
        setAuthed(false);
        setDriver(null);
        return;
      }
      // Session table missing — allow id query + local fallback for demo
      if (idHint) {
        const profileRes = await fetch(`/api/drivers/${idHint}`);
        const profileJson = await profileRes.json();
        if (profileRes.ok && profileJson.ok) {
          applyProfile(
            profileJson.driver,
            profileJson.reviews ?? [],
            false,
            profileJson.hint || json.hint,
          );
          return;
        }
        const local = localGetDriverProfile(idHint);
        if (local) {
          applyProfile(local.driver, local.reviews, true);
          return;
        }
      }
      setError(json.hint ? `${json.error}\n${json.hint}` : json.error);
      setAuthed(false);
    } catch {
      const local = idHint ? localGetDriverProfile(idHint) : null;
      if (local) applyProfile(local.driver, local.reviews, true);
      else {
        setError(t.driverLoadError);
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  }, [applyProfile, searchParams, t.driverLoadError, t.driverMustLoginSoft]);

  useEffect(() => {
    void loadAuthed();
  }, [loadAuthed]);

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
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setDriver({ ...driver, ...json.driver });
      } else {
        setError(json.hint ? `${json.error}\n${json.hint}` : json.error);
      }
    } catch {
      setError(t.driverLoadError);
    } finally {
      setToggling(false);
    }
  }

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/drivers/jobs", { headers: authHeaders() });
      const json = await res.json();
      if (res.ok && json.ok) {
        setJobs(json.jobs || []);
        setJobsHint(json.hint || null);
      } else {
        setJobs([]);
        setJobsHint(json.hint || json.error || null);
      }
    } catch {
      setJobsHint(t.driverJobsHint);
    }
  }, [t.driverJobsHint]);

  useEffect(() => {
    if (authed) loadJobs();
  }, [authed, loadJobs]);

  async function jobAction(
    orderId: string,
    action: "accept" | "start" | "complete",
    podPhotoDataUrl?: string | null,
    podName?: string | null,
  ) {
    setJobBusy(orderId);
    setError(null);
    try {
      const res = await fetch("/api/drivers/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          orderId,
          action,
          podPhotoDataUrl: podPhotoDataUrl || undefined,
          podFileName: podName || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.hint ? `${json.error}\n${json.hint}` : json.error);
      } else {
        if (action === "complete") {
          setPodNote(
            json.pod?.status === "stored"
              ? t.podUploadStored
              : json.pod?.note || json.hint || t.podUploadDeferred,
          );
          setPodOrderId(null);
          setPodPreview(null);
          setPodFileName(null);
        }
        await loadJobs();
      }
    } catch {
      setError(t.driverLoadError);
    } finally {
      setJobBusy(null);
    }
  }

  function onPodFile(file: File | null) {
    if (!file) {
      setPodPreview(null);
      setPodFileName(null);
      return;
    }
    setPodFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPodPreview(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  async function logout() {
    try {
      await fetch("/api/drivers/logout", {
        method: "POST",
        headers: authHeaders(),
      });
    } catch {
      /* ignore */
    }
    clearStoredDriverToken();
    setDriver(null);
    setAuthed(false);
    router.push("/driver/login");
  }

  function vehicleLabel(type: string) {
    if (type === "car") return t.vehicleCar;
    if (type === "suv") return t.vehicleSuv;
    if (type === "van") return t.vehicleVan;
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

  if (!authed || !driver) {
    return (
      <div className="driver-form">
        <h2 className="driver-form-title">{t.driverDashboardTitle}</h2>
        <p className="driver-form-lead">{t.driverMustLogin}</p>
        {error ? (
          <p className="driver-error" role="alert">
            {error}
          </p>
        ) : null}
        <Link href="/driver/login" className="driver-submit" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
          {t.driverLoginCta}
        </Link>
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

      <section className="driver-jobs">
        <div className="driver-reviews-head">
          <h3>{t.driverJobsTitle}</h3>
          <button
            type="button"
            className="driver-jobs-refresh"
            onClick={loadJobs}
          >
            Refresh
          </button>
        </div>
        {jobsHint ? <p className="driver-note">{jobsHint}</p> : null}
        {jobs.length === 0 ? (
          <p className="driver-reviews-empty">{t.driverJobsEmpty}</p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="driver-job-card">
              <div className="driver-job-top">
                <strong>#{job.id.slice(0, 8)}</strong>
                <span className="driver-status-pill inactive">
                  {job.uiStatus || job.status}
                </span>
              </div>
              <p>{job.delivery_address || "—"}</p>
              <p className="driver-job-meta">
                {job.contact_name || "—"}
                {job.total_cents != null
                  ? ` · $${(job.total_cents / 100).toFixed(2)}`
                  : ""}
                {job.payment_status ? ` · pay ${job.payment_status}` : ""}
              </p>
              <div className="driver-job-actions">
                {!job.driver_accepted_at ? (
                  <button
                    type="button"
                    className="driver-submit"
                    style={{ marginTop: 0 }}
                    disabled={jobBusy === job.id}
                    onClick={() => jobAction(job.id, "accept")}
                  >
                    {t.driverJobAccept}
                  </button>
                ) : (
                  <span className="driver-note" style={{ margin: 0 }}>
                    {t.driverJobAccepted}
                  </span>
                )}
                <button
                  type="button"
                  className="driver-logout"
                  style={{ marginTop: 0 }}
                  disabled={jobBusy === job.id}
                  onClick={() => jobAction(job.id, "start")}
                >
                  {t.driverJobStart}
                </button>
                <button
                  type="button"
                  className="driver-logout"
                  style={{ marginTop: 0 }}
                  disabled={jobBusy === job.id}
                  onClick={() => setPodOrderId(job.id)}
                >
                  {t.driverJobComplete}
                </button>
              </div>
              {job.pod_captured_at ? (
                <p className="driver-note" style={{ marginTop: 8 }}>
                  {t.podBadge} · {new Date(job.pod_captured_at).toLocaleString()}
                  {job.pod_status ? ` · ${job.pod_status}` : ""}
                </p>
              ) : null}
              {podOrderId === job.id ? (
                <div className="pod-capture soft-card" style={{ marginTop: 10 }}>
                  <strong>{t.podCaptureTitle}</strong>
                  <p className="driver-note">{t.podCaptureLead}</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(e) => onPodFile(e.target.files?.[0] || null)}
                  />
                  {podPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={podPreview}
                      alt={t.podPreviewAlt}
                      className="pod-thumb"
                    />
                  ) : null}
                  <div className="driver-job-actions" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="driver-submit"
                      style={{ marginTop: 0 }}
                      disabled={jobBusy === job.id}
                      onClick={() =>
                        jobAction(job.id, "complete", podPreview, podFileName)
                      }
                    >
                      {t.podConfirmComplete}
                    </button>
                    <button
                      type="button"
                      className="driver-logout"
                      style={{ marginTop: 0 }}
                      onClick={() => {
                        setPodOrderId(null);
                        setPodPreview(null);
                        setPodFileName(null);
                      }}
                    >
                      {t.back}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
        {podNote ? <p className="driver-note">{podNote}</p> : null}
      </section>

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
                  {"★".repeat(Math.round(Number(r.rating)))}
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

      <button type="button" className="driver-logout" onClick={logout}>
        {t.driverLogout}
      </button>
      <Link href="/driver" className="driver-secondary-link">
        {t.driverCreateAnother}
      </Link>
    </div>
  );
}
