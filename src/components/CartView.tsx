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
    return <p className="p-8 text-center text-dz-muted">Loading cart…</p>;
  }

  return (
    <div className="animate-fade-up">
      {items.length === 0 ? (
        <p className="px-6 py-16 text-center text-dz-muted">
          Your cart is empty. Drop something in!
        </p>
      ) : (
        <div className="space-y-2 py-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="mx-4 flex items-center gap-3 rounded-xl bg-dz-card p-3"
            >
              <div className="min-w-0 flex-1">
                <strong className="text-sm">{item.name}</strong>
                <div className="text-[13px] text-dz-muted">{item.store}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeQty(item.id, -1)}
                  className="h-7 w-7 rounded-full border border-dz-mid bg-dz-dark text-sm"
                >
                  −
                </button>
                <span className="w-4 text-center text-sm">{item.qty}</span>
                <button
                  type="button"
                  onClick={() => changeQty(item.id, 1)}
                  className="h-7 w-7 rounded-full border border-dz-mid bg-dz-dark text-sm"
                >
                  +
                </button>
              </div>
              <div className="w-16 text-right font-bold">
                ${(item.price * item.qty).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 ? (
        <div className="mx-4 mt-4 rounded-xl bg-dz-card p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-dz-muted">Subtotal</span>
            <span className="font-bold">${subtotal.toFixed(2)}</span>
          </div>
          <p className="mt-2 text-[12px] text-dz-muted">
            Delivery (standard): $8.99 – $24.99 depending on vehicle
            <br />
            Exact total calculated at checkout.
          </p>
        </div>
      ) : null}

      <div className="p-4">
        {items.length > 0 ? (
          <Link
            href="/tracking"
            className="mb-3 block w-full rounded-2xl bg-dz-orange py-4 text-center text-base font-bold text-white"
          >
            Checkout (stub) · Track drop
          </Link>
        ) : null}
        <Link
          href="/"
          className="block w-full rounded-2xl border border-dz-mid py-3 text-center text-sm text-dz-muted"
        >
          Keep browsing
        </Link>
      </div>
    </div>
  );
}
