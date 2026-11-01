"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import {
  TRACKING_STEPS,
  isStepCurrent,
  isStepDone,
  type TrackingStep,
} from "@/lib/tracking/status";

type TrackPayload = {
  order: {
    id: string;
    status: string;
    uiStatus?: string;
    step: TrackingStep;
    delivery_address?: string | null;
    contact_name?: string | null;
    total_cents?: number | null;
    vehicle_id?: string | null;
    payment_status?: string | null;
    updated_at?: string;
  };
  driver: {
    id: string;
    name: string;
    phone: string | null;
    vehicle_type: string | null;
    vehicle_detail: string | null;
    license_plate: string | null;
    rating_avg: number | null;
  } | null;
  map: {
    mode: string;
    message: string;
    coords: { lat: number; lon: number } | null;
    imageUrl: string | null;
    address: string;
  };
  hint?: string;
  polledAt?: string;
};

export function TrackingView() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") || "";
  const [data, setData] = useState<TrackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/track`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || t.orderNotFound);
        setData(null);
      } else {
        setData(json as TrackPayload);
        setError(null);
      }
    } catch {
      setError(t.orderNotFound);
    } finally {
      setRefreshing(false);
    }
  }, [orderId, t.orderNotFound]);

  useEffect(() => {
    load();
    if (!orderId) return;
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load, orderId]);

  function stepLabel(step: TrackingStep) {
    if (step === "placed") return t.trackPlaced;
    if (step === "assigned") return t.trackAssigned;
    if (step === "en_route") return t.enRoute;
    return t.delivered;
  }

  if (!orderId) {
    return (
      <div className="tracking">
        <p className="driver-note">{t.trackNeedOrder}</p>
        <Link href="/" className="add-btn">
          {t.newOrder}
        </Link>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="tracking">
        <p className="driver-error">{error}</p>
        <button type="button" className="driver-submit" onClick={load}>
          {t.trackRefresh}
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="empty-state">{t.orderLoading}</p>;
  }

  const { order, driver, map } = data;
  const current = order.step;
  const canceled = order.uiStatus === "canceled";

  return (
    <div className="tracking">
      {map.imageUrl ? (
        <div
          className="map-live"
          style={{ backgroundImage: `url(${map.imageUrl})` }}
          role="img"
          aria-label={map.address || t.mapStub}
        >
          <span className="map-pin-label">{t.trackDeliveryPin}</span>
        </div>
      ) : (
        <div className="map-placeholder map-fallback">
          <div className="map-pin">📍</div>
          <strong>{t.trackDeliveryPin}</strong>
          <p>{map.address || t.jobsite}</p>
          <span className="map-mode-hint">{map.message}</span>
        </div>
      )}

      <div className="tracking-head">
        <h2>{t.droppingSoon}</h2>
        <button
          type="button"
          className="track-refresh-btn"
          disabled={refreshing}
          onClick={load}
        >
          {refreshing ? t.inventoryRefreshing : t.trackRefresh}
        </button>
      </div>
      <p className="tracking-sub">
        {canceled ? (
          <span className="track-canceled">{t.trackCanceled}</span>
        ) : (
          <>
            {t.etaLive}{" "}
            <span className="live-dot">{t.live}</span>
          </>
        )}
      </p>
      {data.hint ? <p className="driver-note">{data.hint}</p> : null}

      <div className="status-steps" aria-label={t.trackTimeline}>
        {TRACKING_STEPS.map((step) => {
          const done = isStepDone(current, step) || current === "delivered";
          const cur = isStepCurrent(current, step) && current !== "delivered";
          const deliveredDone = current === "delivered" && step === "delivered";
          return (
            <div
              key={step}
              className={`step${done || deliveredDone ? " done" : ""}${cur ? " current" : ""}`}
            >
              <div className="step-dot">
                {done || deliveredDone ? "✓" : cur ? "→" : "●"}
              </div>
              {stepLabel(step)}
            </div>
          );
        })}
      </div>

      {driver ? (
        <div className="driver-card">
          <div className="driver-avatar-fallback">
            {driver.name.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <strong>{driver.name}</strong>
            <br />
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              {driver.rating_avg != null
                ? `${Number(driver.rating_avg).toFixed(1)} ★`
                : "—"}{" "}
              · {driver.vehicle_type || "—"}
            </span>
            <br />
            <span style={{ fontSize: 12, color: "var(--orange)" }}>
              {t.verified}
            </span>
          </div>
        </div>
      ) : (
        <div className="soft-card" style={{ margin: "12px 0" }}>
          {t.trackWaitingDriver}
        </div>
      )}

      <div className="soft-card" style={{ margin: "12px 0" }}>
        <strong>{t.vehicle}</strong>
        <br />
        {driver?.vehicle_detail ||
          order.vehicle_id ||
          (driver ? t.vehicleDetail : t.trackWaitingDriver)}
        <br />
        {driver?.license_plate ? (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {t.driverLicense}: {driver.license_plate}
          </span>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        {driver?.phone ? (
          <a
            href={`tel:${driver.phone}`}
            style={{
              flex: 1,
              background: "var(--card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: 12,
              borderRadius: 12,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {t.call}
          </a>
        ) : (
          <button
            type="button"
            style={{
              flex: 1,
              background: "var(--card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: 12,
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            {t.call}
          </button>
        )}
        <Link
          href="/chat"
          style={{
            flex: 1,
            background: "var(--orange)",
            color: "white",
            border: "none",
            padding: 12,
            borderRadius: 12,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {t.chat}
        </Link>
      </div>

      <div className="soft-card" style={{ marginBottom: 12 }}>
        <strong>{t.deliveringTo}</strong>{" "}
        {order.delivery_address || t.jobsite}
        {order.contact_name ? (
          <>
            <br />
            <span style={{ color: "var(--muted)" }}>
              {t.checkoutContact}: {order.contact_name}
            </span>
          </>
        ) : null}
        <br />
        <span style={{ color: "var(--muted)", fontSize: 12 }}>
          {t.orderId}: {order.id.slice(0, 8)}…
          {order.payment_status ? ` · ${t.payStatusLabel}: ${order.payment_status}` : ""}
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{t.tipDriver}</strong>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {[5, 10, 15, 20].map((n) => (
            <button
              key={n}
              type="button"
              className={`tip-btn${tip === n ? " selected" : ""}`}
              onClick={() => setTip(n)}
            >
              ${n}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
          {tip == null ? t.noTip : `${t.tipSelected} $${tip}`}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
        {t.liveUpdates}
        {data.polledAt
          ? ` · ${new Date(data.polledAt).toLocaleTimeString()}`
          : ""}
      </div>
      <Link href="/" className="add-btn">
        {t.newOrder}
      </Link>
    </div>
  );
}
