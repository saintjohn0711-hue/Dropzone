"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/client";

type Driver = Record<string, unknown>;

export function AdminDriverDetail({ id }: { id: string }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/drivers/${id}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Not found");
        setDriver(null);
        return;
      }
      setDriver(json.driver);
      setNotes(String(json.driver.admin_notes || ""));
      setHint(json.hint || null);
    } catch {
      setError("Failed to load driver");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminFetch(`/api/admin/drivers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg(json.error || "Update failed");
      } else {
        setDriver(json.driver);
        setNotes(String(json.driver?.admin_notes || notes));
        setMsg(json.hint || "Saved");
        setHint(json.hint || hint);
      }
    } catch {
      setMsg("Update failed");
    } finally {
      setBusy(false);
    }
  }

  function str(key: string): string {
    const v = driver?.[key];
    if (v == null || v === "") return "—";
    return String(v);
  }

  if (error) {
    return (
      <div className="admin-page">
        <Link href="/admin/drivers" className="admin-back">
          ← Drivers
        </Link>
        <p className="admin-error">{error}</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="admin-page">
        <p className="admin-muted">Loading driver…</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <Link href="/admin/drivers" className="admin-back">
        ← Drivers
      </Link>
      <div className="admin-detail-head">
        <div>
          <h1 className="admin-h1">
            {str("display_name") !== "—" ? str("display_name") : str("name")}
          </h1>
          <p className="admin-lead">{str("email")} · {str("phone")}</p>
        </div>
        <div className="admin-detail-badges">
          <span className={`admin-pill soft ${str("application_status")}`}>
            {str("application_status")}
          </span>
          <span
            className={`admin-pill ${driver.status === "active" ? "on" : "off"}`}
          >
            {str("status")}
          </span>
        </div>
      </div>

      {hint ? <p className="admin-note">{hint}</p> : null}
      {msg ? <p className="admin-note">{msg}</p> : null}

      <div className="admin-actions">
        <button
          type="button"
          className="admin-primary sm"
          disabled={busy}
          onClick={() => patch({ action: "approve" })}
        >
          Approve
        </button>
        <button
          type="button"
          className="admin-secondary sm"
          disabled={busy}
          onClick={() => patch({ action: "reject" })}
        >
          Reject
        </button>
        <button
          type="button"
          className="admin-secondary sm"
          disabled={busy}
          onClick={() => patch({ action: "suspend" })}
        >
          Suspend
        </button>
        <button
          type="button"
          className="admin-secondary sm"
          disabled={busy}
          onClick={() => patch({ status: "active" })}
        >
          Set active
        </button>
        <button
          type="button"
          className="admin-secondary sm"
          disabled={busy}
          onClick={() => patch({ status: "inactive" })}
        >
          Set inactive
        </button>
        <button
          type="button"
          className="admin-secondary sm"
          disabled={busy}
          onClick={() => patch({ action: "reactivate" })}
        >
          Reactivate
        </button>
      </div>

      <div className="admin-detail-grid">
        <section className="admin-panel">
          <h2>Identity</h2>
          <dl className="admin-dl">
            <div>
              <dt>Legal name</dt>
              <dd>{str("name")}</dd>
            </div>
            <div>
              <dt>DOB</dt>
              <dd>{str("date_of_birth")}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>
                {str("address_street")}
                <br />
                {str("address_city")}, {str("address_state")} {str("address_zip")}
              </dd>
            </div>
          </dl>
        </section>

        <section className="admin-panel">
          <h2>Driver’s license</h2>
          <dl className="admin-dl">
            <div>
              <dt>Number</dt>
              <dd>{str("dl_number")}</dd>
            </div>
            <div>
              <dt>State / exp</dt>
              <dd>
                {str("dl_state")} · {str("dl_expiration")}
              </dd>
            </div>
            <div>
              <dt>Uploads</dt>
              <dd>
                Front: {driver.dl_front_present ? "stored" : "none"}
                {driver.dl_front_path ? ` (${String(driver.dl_front_path)})` : ""}
                <br />
                Back: {driver.dl_back_present ? "stored" : "none"}
                <br />
                Status: {str("dl_upload_status")}
              </dd>
            </div>
          </dl>
        </section>

        <section className="admin-panel">
          <h2>Vehicle</h2>
          <dl className="admin-dl">
            <div>
              <dt>Type</dt>
              <dd>{str("vehicle_type")}</dd>
            </div>
            <div>
              <dt>Details</dt>
              <dd>
                {str("vehicle_year")} {str("vehicle_make")} {str("vehicle_model")}{" "}
                ({str("vehicle_color")})
              </dd>
            </div>
            <div>
              <dt>Plate</dt>
              <dd>{str("license_plate")}</dd>
            </div>
            <div>
              <dt>Hauling</dt>
              <dd>{str("hauling_notes")}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-panel">
          <h2>Work & compliance</h2>
          <dl className="admin-dl">
            <div>
              <dt>Service area</dt>
              <dd>{str("service_area")}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>
                {str("availability_days")} · {str("availability_hours")}
              </dd>
            </div>
            <div>
              <dt>Heavy / class</dt>
              <dd>
                {String(driver.can_haul_heavy)} / {str("weight_class")}
              </dd>
            </div>
            <div>
              <dt>Consents</dt>
              <dd>
                Insurance {String(driver.insurance_confirmed)} · BG{" "}
                {String(driver.background_check_consent)} · Terms{" "}
                {String(driver.terms_accepted)} · IC{" "}
                {String(driver.contractor_ack)}
              </dd>
            </div>
            <div>
              <dt>Signature</dt>
              <dd>
                {str("signature_name")} · {str("signed_at")}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="admin-panel">
        <h2>Admin notes</h2>
        <textarea
          className="admin-textarea"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes…"
        />
        <button
          type="button"
          className="admin-primary sm"
          disabled={busy}
          onClick={() => patch({ admin_notes: notes })}
        >
          Save notes
        </button>
        <p className="admin-muted" style={{ marginTop: 10 }}>
          Reviewed: {str("reviewed_at")} by {str("reviewed_by")}
        </p>
      </section>
    </div>
  );
}
