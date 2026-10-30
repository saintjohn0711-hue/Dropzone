"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getVehicleOptions, type Product } from "@/data/products";

const rushOptions = [
  { id: "standard", label: "Standard", detail: "45–70 min", fee: 8.99 },
  { id: "rush", label: "Rush Drop", detail: "20–30 min", fee: 18.99 },
];

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const vehicles = getVehicleOptions(product.weight);
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id);
  const [rushId, setRushId] = useState("standard");

  function addToDrop() {
    try {
      const raw = localStorage.getItem("dz-cart");
      const cart: Array<{ id: string; qty: number; vehicleId?: string; rushId?: string }> =
        raw ? JSON.parse(raw) : [];
      const existing = cart.find((i) => i.id === product.id);
      if (existing) existing.qty += 1;
      else cart.push({ id: product.id, qty: 1, vehicleId, rushId });
      localStorage.setItem("dz-cart", JSON.stringify(cart));
    } catch {
      /* ignore */
    }
    router.push("/cart");
  }

  return (
    <div className="animate-slide-in">
      <div
        className="h-52 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${product.img})` }}
        role="img"
        aria-label={product.name}
      />
      <div className="px-4 py-4">
        <h1 className="font-display text-xl font-extrabold leading-tight">{product.name}</h1>
        <p className="mt-1 text-sm text-dz-muted">{product.store}</p>
        <span className="mt-2 inline-block rounded bg-dz-orange px-2 py-0.5 text-[10px] font-bold text-white">
          Delivers in {product.eta}
        </span>
        <p className="mt-3 text-[15px]">{product.stock}</p>
        <p className="mt-1 text-xs text-dz-muted">SKU {product.sku}</p>
        <p className="mt-3 font-display text-[28px] font-extrabold text-dz-orange">
          ${product.price.toFixed(2)}
        </p>

        <div className="mt-5">
          <strong className="text-sm">Delivery Vehicle</strong>
          <div className="mt-2 space-y-2">
            {vehicles.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicleId(v.id)}
                className={`flex w-full items-center justify-between rounded-xl bg-dz-card px-3 py-3 text-left border ${
                  vehicleId === v.id ? "border-dz-orange" : "border-transparent"
                }`}
              >
                <div>
                  <div>
                    {v.icon} {v.name}
                  </div>
                  <small className="text-dz-muted">{v.desc}</small>
                </div>
                <span className="font-bold text-dz-orange">+${v.fee.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <strong className="text-sm">Speed</strong>
          <div className="mt-2 space-y-2">
            {rushOptions.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRushId(r.id)}
                className={`flex w-full items-center justify-between rounded-xl bg-dz-card px-3 py-3 text-left border ${
                  rushId === r.id ? "border-dz-orange" : "border-transparent"
                }`}
              >
                <div>
                  <div>{r.label}</div>
                  <small className="text-dz-muted">{r.detail}</small>
                </div>
                <span className="font-bold text-dz-orange">${r.fee.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={addToDrop}
          className="mt-6 w-full rounded-2xl bg-dz-orange py-4 text-base font-bold text-white transition hover:bg-dz-orange-bright"
        >
          Add to Drop
        </button>
        <Link
          href="/pricing"
          className="mt-3 block text-center text-sm text-dz-muted underline-offset-2 hover:text-dz-orange hover:underline"
        >
          See pricing guide
        </Link>
      </div>
    </div>
  );
}
