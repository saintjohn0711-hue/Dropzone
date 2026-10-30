import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";

const speeds = [
  { title: "Standard", detail: "45–70 minutes · Most orders", price: "$8.99+" },
  { title: "Rush Drop", detail: "20–30 minutes · Priority dispatch", price: "$18.99+" },
];

const vehicles = [
  {
    icon: "🚗",
    title: "Car / Van",
    detail: "Small items, hardware, paint, office supplies",
  },
  {
    icon: "🛻",
    title: "Pickup Truck",
    detail: "Lumber, bags of cement, medium loads",
  },
  {
    icon: "🚛",
    title: "Box Truck / Flatbed",
    detail: "Heavy materials, long items, pallets",
  },
  {
    icon: "🚁",
    title: "Drone",
    detail: "Ultra-light & urgent only (tools, small hardware)",
  },
];

export default function PricingPage() {
  return (
    <AppShell>
      <BrandHeader showBack />
      <div className="animate-fade-up px-4 py-4">
        <h1 className="font-display text-xl font-extrabold">Pricing guide</h1>
        <p className="mt-2 text-sm text-dz-muted">
          Transparent pricing. No hidden fees. Exact total calculated at checkout based
          on distance, weight, and demand.
        </p>

        <h2 className="mt-6 font-display text-base font-bold">Speed</h2>
        <div className="mt-2 space-y-2">
          {speeds.map((s) => (
            <div
              key={s.title}
              className="flex items-center justify-between rounded-xl bg-dz-card px-3 py-3"
            >
              <div>
                <div className="font-semibold">{s.title}</div>
                <small className="text-dz-muted">{s.detail}</small>
              </div>
              <span className="font-bold text-dz-orange">{s.price}</span>
            </div>
          ))}
        </div>

        <h2 className="mt-6 font-display text-base font-bold">Vehicles</h2>
        <div className="mt-2 space-y-2">
          {vehicles.map((v) => (
            <div key={v.title} className="rounded-xl bg-dz-card px-3 py-3">
              <div className="font-semibold">
                {v.icon} {v.title}
              </div>
              <small className="text-dz-muted">{v.detail}</small>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-dz-card p-3.5 text-[13px] text-dz-muted">
          Delivery fees scale with vehicle capacity and rush tier. Product prices come
          from partner store inventory (SKU + live scrub when configured).
        </div>
      </div>
    </AppShell>
  );
}
