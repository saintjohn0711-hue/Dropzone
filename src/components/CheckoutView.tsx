"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getStoredCustomerId } from "@/lib/customer-session-client";
import { localRememberOrder } from "@/lib/customers-local";
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
  const searchParams = useSearchParams();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeMode, setStripeMode] = useState<{
    mode: string;
    configured: boolean;
    message: string;
  } | null>(null);
  const canceled = searchParams.get("canceled") === "1";

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dz-cart");
      setLines(raw ? JSON.parse(raw) : []);
      const savedAddr = localStorage.getItem("dz-checkout-address");
      if (savedAddr) setAddress(savedAddr);
    } catch {
      setLines([]);
    }
    setReady(true);
    fetch("/api/checkout")
      .then((r) => r.json())
      .then((j) => {
        if (j.stripeMode) setStripeMode(j.stripeMode);
      })
      .catch(() => null);
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
  const stripeReady = Boolean(stripeMode?.configured);

  async function placeOrder(payMode: "stripe" | "demo") {
    if (!items.length) return;
    setBusy(true);
    setError(null);
    try {
      const customerId = getStoredCustomerId();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryAddress: address,
          contactName: contact,
          contactEmail: email || undefined,
          customerId: customerId || undefined,
          sessionKey: sessionKey(),
          payMode,
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

      if (json.stripeMode) setStripeMode(json.stripeMode);

      if (customerId && json.order?.id) {
        try {
          localRememberOrder(customerId, json.order.id);
        } catch {
          /* ignore */
        }
      }

      localStorage.setItem(
        "dz-last-order",
        JSON.stringify({
          id: json.order.id,
          address,
          totalCents: json.totals?.totalCents ?? Math.round(total * 100),
          vehicleId,
          rushId,
          payment: json.payment,
        }),
      );

      if (json.payment?.checkoutUrl) {
        localStorage.removeItem("dz-cart");
        window.location.href = json.payment.checkoutUrl;
        return;
      }

      localStorage.removeItem("dz-cart");
      router.push(`/order/${json.order.id}?demoPay=1`);
    } catch {
      setError(t.checkoutError);
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await placeOrder(stripeReady ? "stripe" : "demo");
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
    <form className="checkout-form" onSubmit={onSubmit}>
      <h2 className="checkout-title">{t.checkoutTitle}</h2>
      <p className="checkout-lead">{t.checkoutLead}</p>

      {!stripeReady ? (
        <div className="pay-banner demo" role="status">
          <strong>{t.payDemoBannerTitle}</strong>
          <p>{t.payDemoBannerBody}</p>
        </div>
      ) : (
        <div className="pay-banner live" role="status">
          <strong>{t.payStripeReady}</strong>
          <p>{t.payStripeReadyBody}</p>
        </div>
      )}

      {canceled ? (
        <p className="driver-note" role="status">
          {t.payCanceled}
        </p>
      ) : null}

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
        {t.checkoutEmail}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
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
        {busy
          ? t.checkoutPlacing
          : stripeReady
            ? t.checkoutPayStripe
            : t.checkoutPlaceDemo}
      </button>

      {stripeReady ? (
        <button
          type="button"
          className="driver-logout"
          style={{ marginTop: 8 }}
          disabled={busy}
          onClick={() => placeOrder("demo")}
        >
          {t.checkoutPlaceDemoAlt}
        </button>
      ) : null}

      <Link href="/cart" className="driver-secondary-link">
        {t.checkoutBackToCart}
      </Link>
    </form>
  );
}
