"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function TrackingPage() {
  const { t } = useLocale();
  const [tip, setTip] = useState<number | null>(null);

  return (
    <AppShell>
      <BrandHeader titleKey="liveDrop" />
      <div className="tracking">
        <div className="map-placeholder">{t.mapStub}</div>
        <h2 style={{ marginBottom: 6, fontSize: 20 }}>
          {t.droppingSoon}
        </h2>
        <p style={{ color: "var(--muted)", marginBottom: 16 }}>
          {t.etaLive}{" "}
          <span style={{ color: "var(--live)" }}>{t.live}</span>
        </p>

        <div className="status-steps">
          <div className="step done">
            <div className="step-dot">✓</div>
            {t.confirmed}
          </div>
          <div className="step done">
            <div className="step-dot">✓</div>
            {t.pickedUp}
          </div>
          <div className="step current">
            <div className="step-dot">→</div>
            {t.enRoute}
          </div>
          <div className="step">
            <div className="step-dot">●</div>
            {t.delivered}
          </div>
        </div>

        <div className="driver-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
            alt="Alex M."
            style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
          />
          <div style={{ flex: 1 }}>
            <strong>Alex M.</strong>
            <br />
            <span style={{ color: "var(--muted)", fontSize: 13 }}>4.9 ★ • 217 drops</span>
            <br />
            <span style={{ fontSize: 12, color: "var(--orange)" }}>{t.verified}</span>
          </div>
        </div>

        <div className="soft-card" style={{ margin: "12px 0" }}>
          <strong>{t.vehicle}</strong>
          <br />
          {t.vehicleDetail}
          <br />
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{t.license}</span>
        </div>

        <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
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
          <strong>{t.deliveringTo}</strong> {t.jobsite}
          <br />
          <span style={{ color: "var(--muted)" }}>{t.contactAccess}</span>
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
        </div>
        <Link href="/" className="add-btn">
          {t.newOrder}
        </Link>
      </div>
    </AppShell>
  );
}
