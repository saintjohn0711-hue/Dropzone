"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  customerAuthHeaders,
  getStoredCustomerId,
  getStoredCustomerToken,
} from "@/lib/customer-session-client";
import { localGetCustomer } from "@/lib/customers-local";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type OrderRow = {
  id: string;
  status: string;
  uiStatus?: string;
  total_cents?: number | null;
  delivery_address?: string | null;
  created_at?: string;
  pod_captured_at?: string | null;
  pod_status?: string | null;
};

export function CustomerOrders() {
  const { t } = useLocale();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  const load = useCallback(async () => {
    const token = getStoredCustomerToken();
    const id = getStoredCustomerId();
    if (!token && !id) {
      setAuthed(false);
      return;
    }
    setAuthed(true);

    if (token?.startsWith("local-") && id) {
      const local = localGetCustomer(id);
      if (local?.orderIds?.length) {
        setOrders(
          local.orderIds.map((oid) => ({
            id: oid,
            status: "pending",
            uiStatus: "placed",
          })),
        );
        setHint(t.customerLocalNote);
        return;
      }
      setOrders([]);
      setHint(t.customerOrdersEmptySoft);
      return;
    }

    try {
      const res = await fetch("/api/customers/orders", {
        headers: customerAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setOrders(json.orders || []);
        setHint(json.hint || null);
      } else {
        setError(json.error || t.customerOrdersError);
        setHint(json.hint || null);
      }
    } catch {
      setError(t.customerOrdersError);
    }
  }, [t.customerLocalNote, t.customerOrdersEmptySoft, t.customerOrdersError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reorder(orderId: string) {
    setBusyId(orderId);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/orders/${encodeURIComponent(orderId)}/reorder`,
        {
          method: "POST",
          headers: customerAuthHeaders(),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.hint ? `${json.error}\n${json.hint}` : json.error);
        return;
      }
      const lines = (json.lines || []).map(
        (l: { id: string; qty: number }) => ({
          id: l.id,
          qty: l.qty || 1,
        }),
      );
      localStorage.setItem("dz-cart", JSON.stringify(lines));
      if (json.deliveryAddress) {
        localStorage.setItem("dz-checkout-address", json.deliveryAddress);
      }
      router.push("/cart");
    } catch {
      setError(t.customerReorderError);
    } finally {
      setBusyId(null);
    }
  }

  if (!authed) {
    return (
      <div className="driver-form">
        <h2 className="driver-form-title">{t.customerOrderHistory}</h2>
        <p className="driver-form-lead">{t.customerMustLogin}</p>
        <Link
          href="/account/login"
          className="driver-submit"
          style={{ display: "block", textAlign: "center", textDecoration: "none" }}
        >
          {t.customerSignIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      <div className="driver-reviews-head">
        <h2 className="driver-form-title" style={{ margin: 0 }}>
          {t.customerOrderHistory}
        </h2>
        <Link href="/account">{t.customerAccountTitle}</Link>
      </div>
      {hint ? <p className="driver-note">{hint}</p> : null}
      {error ? <p className="driver-error">{error}</p> : null}

      {orders.length === 0 ? (
        <p className="driver-reviews-empty">{t.customerOrdersEmpty}</p>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="driver-job-card">
            <div className="driver-job-top">
              <strong>#{o.id.slice(0, 8)}</strong>
              <span className="driver-status-pill inactive">
                {o.uiStatus || o.status}
              </span>
            </div>
            <p>{o.delivery_address || "—"}</p>
            <p className="driver-job-meta">
              {o.total_cents != null
                ? `$${(o.total_cents / 100).toFixed(2)}`
                : "—"}
              {o.created_at
                ? ` · ${new Date(o.created_at).toLocaleDateString()}`
                : ""}
              {o.pod_captured_at ? ` · ${t.podBadge}` : ""}
            </p>
            <div className="driver-job-actions">
              <Link
                href={`/tracking?order=${o.id}`}
                className="driver-logout"
                style={{
                  marginTop: 0,
                  textAlign: "center",
                  textDecoration: "none",
                  display: "inline-block",
                  padding: "10px 12px",
                }}
              >
                {t.orderTrackDrop}
              </Link>
              <button
                type="button"
                className="driver-submit"
                style={{ marginTop: 0 }}
                disabled={busyId === o.id}
                onClick={() => reorder(o.id)}
              >
                {busyId === o.id ? t.customerReordering : t.customerReorder}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
