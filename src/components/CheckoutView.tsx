"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { resolveProduct } from "@/lib/resolve-product";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type CartLine = {
  id: string;
  qty: number;
  vehicleId?: string;
  rushId?: string;
};

function sessionKey() {
  try {
    let key = localStorage.getItem("dz-session-key");
    if (!key) {
      key = `guest-${crypto.randomUUID?.() || Date.now()}`;
      localStorage.setItem("dz-session-key", key);
    }
    return key;
  } catch {
    return `guest-${Date.now()}`;
  }
}

export function CheckoutView() {
  const { t } = useLocale();
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dz-cart");
      setLines(raw ? JSON.parse(raw) : []);
    } catch {
      setLines([]);
    }
    setReady(true);
  }, []);

  const items = useMemo(
    () =>
      lines
        .map((l) => {
          const p = resolveProduct(l.id);
          return p
            ? {
                ...p,
                qty: l.qty,
                vehicleId: l.vehicleId,
                rushId: l.rushId,
              }
            : null;
        })
        .filter(Boolean) as Array<
        NonNullable<ReturnType<typeof resolveProduct>> & {
          qty: number;
          vehicleId?: string;
          rushId?: string;
        }
      >,
    [lines],
  );

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const vehicleId = items[0]?.vehicleId || "pickup";
  const rushId = items[0]?.rushId || "standard";
  let delivery = 8.99;
  if (vehicleId === "pickup") delivery = 14.99;
  if (vehicleId === "box" || vehicleId === "box_truck") delivery = 24.99;
  if (vehicleId === "drone") delivery = 12.99;
  if (rushId === "rush") delivery += 10;
  const total = subtotal + delivery;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryAddress: address,
          contactName: contact,
          sessionKey: sessionKey(),
          items: items.map((i) => ({
            id: i.id,
            sku: i.sku,
            name: i.name,
            price: i.price,
            qty: i.qty,
            vehicleId: i.vehicleId,
            rushId: i.rushId,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(
          json.hint ? `${json.error}\n${json.hint}` : json.error || t.checkoutError,
        );
        setBusy(false);
        return;
      }
      localStorage.removeItem("dz-cart");
      localStorage.setItem(
        "dz-last-order",
        JSON.stringify({
          id: json.order.id,
          address,
          totalCents: json.totals?.totalCents ?? Math.round(total * 100),
          vehicleId,
          rushId,
        }),
      );
      router.push(`/order/${json.order.id}`);
    } catch {
      setError(t.checkoutError);
      setBusy(false);
    }
  }

  if (!ready) return <p className="empty-state">{t.loadingCart}</p>;

  if (items.length === 0) {
    return (
      <div className="checkout-form">
        <p className="empty-state">{t.cartEmpty}</p>
        <Link href="/" className="checkout-btn" style={{ background: "var(--dark)" }}>
          {t.keepBrowsing}
        </Link>
      </div>
    );
  }

  return (
    <form className="checkout-form" onSubmit={placeOrder}>
      <h2 className="checkout-title">{t.checkoutTitle}</h2>
      <p className="checkout-lead">{t.checkoutLead}</p>

      <div className="checkout-lines">
        {items.map((item) => (
          <div key={item.id} className="checkout-line">
            <div>
              <strong>{item.name}</strong>
              <div className="checkout-line-meta">
                {item.store} · ×{item.qty}
                {item.vehicleId ? ` · ${item.vehicleId}` : ""}
                {item.rushId === "rush" ? ` · ${t.rushDrop}` : ""}
              </div>
            </div>
            <strong>${(item.price * item.qty).toFixed(2)}</strong>
          </div>
        ))}
      </div>

      <label className="driver-label">
        {t.checkoutContact}
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t.checkoutContactPlaceholder}
        />
      </label>

      <label className="driver-label">
        {t.checkoutAddress}
        <textarea
          required
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t.checkoutAddressPlaceholder}
        />
      </label>

      <div className="checkout-totals">
        <div>
          <span>{t.subtotal}</span>
          <strong>${subtotal.toFixed(2)}</strong>
        </div>
        <div>
          <span>{t.checkoutDeliveryFee}</span>
          <strong>${delivery.toFixed(2)}</strong>
        </div>
        <div className="checkout-total-row">
          <span>{t.checkoutTotal}</span>
          <strong>${total.toFixed(2)}</strong>
        </div>
      </div>

      {error ? (
        <p className="driver-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="driver-submit" disabled={busy}>
        {busy ? t.checkoutPlacing : t.checkoutPlaceOrder}
      </button>
      <Link href="/cart" className="driver-secondary-link">
        {t.checkoutBackToCart}
      </Link>
    </form>
  );
}
