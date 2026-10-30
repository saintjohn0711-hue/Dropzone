"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProduct } from "@/data/products";

type CartLine = { id: string; qty: number };

export function CartView() {
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
      const p = getProduct(l.id);
      return p ? { ...p, qty: l.qty } : null;
    })
    .filter(Boolean) as Array<NonNullable<ReturnType<typeof getProduct>> & { qty: number }>;

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (!ready) {
    return <p className="empty-state">Loading cart…</p>;
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="empty-state">Your cart is empty. Drop something in!</p>
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
        <div id="cartTotal" style={{ padding: 16, fontWeight: 700, fontSize: 18 }}>
          Subtotal: ${subtotal.toFixed(2)}
          <div style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            Delivery (standard): $8.99 – $24.99 depending on vehicle
            <br />
            Exact total calculated at checkout.
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <Link href="/tracking" className="checkout-btn">
          Drop it now →
        </Link>
      ) : (
        <Link href="/" className="checkout-btn" style={{ background: "var(--card)" }}>
          Keep browsing
        </Link>
      )}
    </>
  );
}
