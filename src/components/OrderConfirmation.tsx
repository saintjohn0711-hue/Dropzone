"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Order = {
  id: string;
  status?: string;
  total_cents?: number | null;
  delivery_address?: string | null;
  contact_name?: string | null;
  vehicle_id?: string | null;
  rush_id?: string | null;
};

export function OrderConfirmation({ orderId }: { orderId: string }) {
  const { t } = useLocale();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/checkout?id=${encodeURIComponent(orderId)}`);
        const json = await res.json();
        if (!cancelled) {
          if (res.ok && json.ok) setOrder(json.order);
          else {
            // fallback to last local order snapshot
            try {
              const raw = localStorage.getItem("dz-last-order");
              const local = raw ? JSON.parse(raw) : null;
              if (local?.id === orderId) {
                setOrder({
                  id: orderId,
                  status: "pending",
                  total_cents: local.totalCents,
                  delivery_address: local.address,
                  vehicle_id: local.vehicleId,
                  rush_id: local.rushId,
                });
              } else {
                setError(json.error || t.orderNotFound);
              }
            } catch {
              setError(json.error || t.orderNotFound);
            }
          }
        }
      } catch {
        if (!cancelled) setError(t.orderNotFound);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, t.orderNotFound]);

  if (error) {
    return (
      <div className="checkout-form">
        <p className="driver-error">{error}</p>
        <Link href="/" className="checkout-btn">
          {t.keepBrowsing}
        </Link>
      </div>
    );
  }

  if (!order) {
    return <p className="empty-state">{t.orderLoading}</p>;
  }

  const total =
    order.total_cents != null ? (order.total_cents / 100).toFixed(2) : "—";

  return (
    <div className="checkout-form order-confirm">
      <div className="order-confirm-badge">✓</div>
      <h2 className="checkout-title">{t.orderConfirmedTitle}</h2>
      <p className="checkout-lead">{t.orderConfirmedLead}</p>

      <div className="driver-meta">
        <div className="driver-meta-row">
          <span>{t.orderId}</span>
          <strong style={{ fontSize: 12 }}>{order.id.slice(0, 8)}…</strong>
        </div>
        <div className="driver-meta-row">
          <span>{t.checkoutTotal}</span>
          <strong>${total}</strong>
        </div>
        <div className="driver-meta-row">
          <span>{t.checkoutAddress}</span>
          <strong>{order.delivery_address || "—"}</strong>
        </div>
        {order.contact_name ? (
          <div className="driver-meta-row">
            <span>{t.checkoutContact}</span>
            <strong>{order.contact_name}</strong>
          </div>
        ) : null}
        <div className="driver-meta-row">
          <span>{t.orderStatus}</span>
          <strong>{order.status || "pending"}</strong>
        </div>
      </div>

      <Link href={`/tracking?order=${order.id}`} className="driver-submit" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
        {t.orderTrackDrop}
      </Link>
      <Link href="/" className="driver-secondary-link">
        {t.newOrder}
      </Link>
    </div>
  );
}
