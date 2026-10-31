"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getVehicleOptions, type Product } from "@/data/products";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { t } = useLocale();
  const vehicles = getVehicleOptions(product.weight);
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id);
  const [rushId, setRushId] = useState("standard");

  function vehicleLabel(v: (typeof vehicles)[number]) {
    const opts = t.vehicleOpts;
    if (v.id === "car") {
      return {
        name: opts.car.name,
        desc: product.weight === "light" ? opts.car.light : opts.car.medium,
      };
    }
    if (v.id === "drone") return { name: opts.drone.name, desc: opts.drone.desc };
    if (v.id === "pickup") {
      return {
        name: opts.pickup.name,
        desc: product.weight === "heavy" ? opts.pickup.heavy : opts.pickup.medium,
      };
    }
    return { name: opts.box.name, desc: opts.box.desc };
  }

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

  const rushOptions = [
    { id: "standard", label: t.standard, detail: "45–70 min", fee: 8.99 },
    { id: "rush", label: t.rushDrop, detail: "20–30 min", fee: 18.99 },
  ];

  return (
    <div className="product-detail">
      <div
        className="detail-img"
        style={{ backgroundImage: `url(${product.img})` }}
      />
      <h2 style={{ marginBottom: 8 }}>{product.name}</h2>
      <div style={{ color: "var(--muted)", marginBottom: 8 }}>{product.store}</div>
      <span className="badge">
        {t.deliversIn} {product.eta}
      </span>
      <div style={{ margin: "12px 0", fontSize: 15 }}>{product.stock}</div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>SKU {product.sku}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "var(--orange)",
          marginBottom: 12,
          marginTop: 8,
        }}
      >
        ${product.price.toFixed(2)}
      </div>

      <div className="vehicle-options">
        <strong style={{ fontSize: 14 }}>{t.deliveryVehicle}</strong>
        {vehicles.map((v) => {
          const label = vehicleLabel(v);
          return (
            <button
              key={v.id}
              type="button"
              className={`option-row${vehicleId === v.id ? " selected" : ""}`}
              onClick={() => setVehicleId(v.id)}
            >
              <div>
                {v.icon} {label.name}
                <br />
                <small style={{ color: "var(--muted)" }}>{label.desc}</small>
              </div>
              <div className="price-tag">+${v.fee.toFixed(2)}</div>
            </button>
          );
        })}
      </div>

      <div className="rush-options">
        <strong style={{ fontSize: 14 }}>{t.speed}</strong>
        {rushOptions.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`option-row${rushId === r.id ? " selected" : ""}`}
            onClick={() => setRushId(r.id)}
          >
            <div>
              {r.label}
              <br />
              <small style={{ color: "var(--muted)" }}>{r.detail}</small>
            </div>
            <div className="price-tag">${r.fee.toFixed(2)}</div>
          </button>
        ))}
      </div>

      <button type="button" className="add-btn" onClick={addToDrop}>
        {t.addToDrop}
      </button>
    </div>
  );
}
