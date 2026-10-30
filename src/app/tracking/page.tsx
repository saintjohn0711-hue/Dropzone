"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";

export default function TrackingPage() {
  const [tip, setTip] = useState<number | null>(null);

  return (
    <AppShell>
      <BrandHeader title="Live Drop" />
      <div className="tracking">
        <div className="map-placeholder">Map stub · live route coming soon</div>
        <h2 style={{ marginBottom: 6, fontSize: 20 }}>
          Your materials are dropping soon
        </h2>
        <p style={{ color: "var(--muted)", marginBottom: 16 }}>
          ETA 28–35 min • On time •{" "}
          <span style={{ color: "#3D7A4A" }}>● Live</span>
        </p>

        <div className="status-steps">
          <div className="step done">
            <div className="step-dot">✓</div>Confirmed
          </div>
          <div className="step done">
            <div className="step-dot">✓</div>Picked Up
          </div>
          <div className="step current">
            <div className="step-dot">→</div>En Route
          </div>
          <div className="step">
            <div className="step-dot">●</div>Delivered
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
            <span style={{ fontSize: 12, color: "var(--orange)" }}>
              Verified • Background checked
            </span>
          </div>
        </div>

        <div
          style={{
            background: "var(--card)",
            borderRadius: 12,
            padding: 12,
            margin: "12px 0",
            fontSize: 14,
          }}
        >
          <strong>Vehicle</strong>
          <br />
          Ford F-150 Pickup • Orange DropZone wrap
          <br />
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            License: NY ABC-1234 • Capacity: up to 1,500 lbs
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
          <button
            type="button"
            style={{
              flex: 1,
              background: "var(--card)",
              color: "white",
              border: "1px solid #3D5242",
              padding: 12,
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            📞 Call
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
            💬 Chat
          </Link>
        </div>

        <div
          style={{
            background: "var(--card)",
            borderRadius: 12,
            padding: 12,
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          <strong>Delivering to:</strong> Jobsite – 1234 Construction Way
          <br />
          <span style={{ color: "var(--muted)" }}>
            Contact: Mike on site • Access: Gate code 4421
          </span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 14 }}>Tip your driver</strong>
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
            {tip == null ? "No tip selected" : `Tip selected: $${tip}`}
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
          Live updates • Photo proof on delivery • You can message the driver anytime
        </div>
        <Link href="/" className="add-btn">
          New Order
        </Link>
      </div>
    </AppShell>
  );
}
