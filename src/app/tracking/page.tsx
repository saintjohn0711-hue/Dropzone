import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";

const steps = [
  { label: "Order confirmed", done: true },
  { label: "Picked at store", done: true },
  { label: "En route", done: true, current: true },
  { label: "Delivered", done: false },
];

export default function TrackingPage() {
  return (
    <AppShell>
      <BrandHeader showBack backHref="/cart" />
      <div className="animate-fade-up px-4 py-4">
        <h1 className="font-display text-xl font-extrabold">Tracking</h1>
        <p className="mt-1 text-sm text-dz-muted">
          ETA 28–35 min · On time ·{" "}
          <span className="text-dz-live">
            <span className="animate-pulse-soft">●</span> Live
          </span>
        </p>

        <div
          className="mt-4 flex h-40 items-center justify-center rounded-2xl border border-dz-border bg-dz-card text-sm text-dz-muted"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(232,93,4,0.15), transparent 40%), linear-gradient(225deg, rgba(61,82,66,0.5), transparent 50%)",
          }}
        >
          Map stub · driver route overlay coming soon
        </div>

        <ol className="mt-5 space-y-3">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span
                className={`h-3 w-3 rounded-full ${
                  s.current
                    ? "bg-dz-orange"
                    : s.done
                      ? "bg-dz-live"
                      : "border border-dz-mid bg-transparent"
                }`}
              />
              <span className={s.done || s.current ? "text-dz-text" : "text-dz-muted"}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-xl bg-dz-card p-3">
          <div className="font-semibold">Alex M.</div>
          <div className="text-[13px] text-dz-muted">4.9 ★ · 217 drops</div>
          <div className="text-xs text-dz-orange">Verified · Background checked</div>
          <div className="mt-2 text-[13px] text-dz-muted">
            License: NY ABC-1234 · Capacity: up to 1,500 lbs
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl border border-dz-mid bg-dz-card py-3 font-semibold"
          >
            Call
          </button>
          <Link
            href="/chat"
            className="flex-1 rounded-xl bg-dz-orange py-3 text-center font-semibold text-white"
          >
            Chat
          </Link>
        </div>

        <div className="mt-4 rounded-xl bg-dz-card p-3 text-sm">
          <div className="font-semibold">Jobsite</div>
          <span className="text-[13px] text-dz-muted">
            Contact: Mike on site · Access: Gate code 4421
          </span>
        </div>

        <p className="mt-4 text-[13px] text-dz-muted">
          Live updates · Photo proof on delivery · Message the driver anytime
        </p>

        <Link
          href="/"
          className="mt-4 block w-full rounded-2xl bg-dz-orange py-4 text-center font-bold text-white"
        >
          New Order
        </Link>
      </div>
    </AppShell>
  );
}
