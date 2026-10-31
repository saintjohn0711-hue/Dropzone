"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resolveProduct } from "@/lib/resolve-product";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type CartLine = { id: string; qty: number };

export function CartView() {
  const { t } = useLocale();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dz-cart");
      setLines(raw ? JSON.parse(raw) : []);
    } catch {
      setLines([]);
    }
    setReady(true);
  }, []);

  function persist(next: CartLine[]) {
    setLines(next);
    localStorage.setItem("dz-cart", JSON.stringify(next));
  }

  function changeQty(id: string, delta: number) {
    const next = lines
      .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
      .filter((l) => l.qty > 0);
    persist(next);
  }

  const items = lines
    .map((l) => {
      const p = resolveProduct(l.id);
      return p ? { ...p, qty: l.qty } : null;
    })
    .filter(Boolean) as Array<
    NonNullable<ReturnType<typeof resolveProduct>> & { qty: number }
  >;

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (!ready) {
    return <p className="empty-state">{t.loadingCart}</p>;
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="empty-state">{t.cartEmpty}</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="cart-item">
            <div style={{ flex: 1 }}>
              <strong>{item.name}</strong>
              <br />
              <span style={{ color: "var(--muted)", fontSize: 13 }}>{item.store}</span>
            </div>
            <div className="qty">
              <button type="button" onClick={() => changeQty(item.id, -1)}>
                −
              </button>
              <span>{item.qty}</span>
              <button type="button" onClick={() => changeQty(item.id, 1)}>
                +
              </button>
            </div>
            <div style={{ fontWeight: 700 }}>${(item.price * item.qty).toFixed(2)}</div>
          </div>
        ))
      )}

      {items.length > 0 ? (
        <div style={{ padding: 16, fontWeight: 700, fontSize: 18 }}>
          {t.subtotal}: ${subtotal.toFixed(2)}
          <div style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            {t.deliveryRange}
            <br />
            {t.exactTotal}
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <Link href="/checkout" className="checkout-btn">
          {t.dropItNow}
        </Link>
      ) : (
        <Link href="/" className="checkout-btn" style={{ background: "var(--dark)" }}>
          {t.keepBrowsing}
        </Link>
      )}
    </>
  );
}
