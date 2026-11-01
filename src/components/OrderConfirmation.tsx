"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Order = {
  id: string;
  status?: string;
  total_cents?: number | null;
  delivery_address?: string | null;
  contact_name?: string | null;
  vehicle_id?: string | null;
  rush_id?: string | null;
  payment_status?: string | null;
};

export function OrderConfirmation({ orderId }: { orderId: string }) {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payNote, setPayNote] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");
  const paidFlag = searchParams.get("paid") === "1";
  const demoPay = searchParams.get("demoPay") === "1";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionId) {
        try {
          const conf = await fetch(
            `/api/payments/confirm?session_id=${encodeURIComponent(sessionId)}`,
          );
          const confJson = await conf.json();
          if (confJson.paid) {
            setPayNote(t.paySuccessStripe);
          } else if (confJson.ok === false) {
            setPayNote(confJson.error || t.payConfirmPending);
          }
        } catch {
          setPayNote(t.payConfirmPending);
        }
      } else if (demoPay) {
        setPayNote(t.paySuccessDemo);
      } else if (paidFlag) {
        setPayNote(t.paySuccessStripe);
      }

      try {
        const res = await fetch(`/api/checkout?id=${encodeURIComponent(orderId)}`);
        const json = await res.json();
        if (!cancelled) {
          if (res.ok && json.ok) setOrder(json.order);
          else {
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
                  payment_status: local.payment?.status || (demoPay ? "demo" : null),
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
  }, [orderId, sessionId, paidFlag, demoPay, t]);

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
  const payStatus = order.payment_status || (demoPay ? "demo" : paidFlag ? "paid" : "—");

  return (
    <div className="checkout-form order-confirm">
      <div className="order-confirm-badge">✓</div>
      <h2 className="checkout-title">{t.orderConfirmedTitle}</h2>
      <p className="checkout-lead">{t.orderConfirmedLead}</p>

      {payNote ? (
        <div className="pay-banner live" role="status">
          <strong>{t.payStatusLabel}</strong>
          <p>{payNote}</p>
        </div>
      ) : null}

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
          <span>{t.payStatusLabel}</span>
          <strong>{payStatus}</strong>
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

      <Link
        href={`/tracking?order=${order.id}`}
        className="driver-submit"
        style={{ display: "block", textAlign: "center", textDecoration: "none" }}
      >
        {t.orderTrackDrop}
      </Link>
      <Link href="/" className="driver-secondary-link">
        {t.newOrder}
      </Link>
    </div>
  );
}
