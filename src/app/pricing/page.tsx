import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";

export default function PricingPage() {
  return (
    <AppShell>
      <BrandHeader title="Pricing Guide" showBack />
      <div style={{ padding: 16 }}>
        <p style={{ marginBottom: 16, color: "var(--muted)", fontSize: 14 }}>
          Transparent pricing. No hidden fees. Exact total calculated at checkout based
          on distance, weight, and demand.
        </p>

        <h3 style={{ marginBottom: 12 }}>Delivery Speed</h3>
        <div className="option-row">
          <div>
            <strong>Standard</strong>
            <br />
            <small style={{ color: "var(--muted)" }}>45–70 minutes • Most orders</small>
          </div>
          <div className="price-tag">$8.99 – $24.99</div>
        </div>
        <div className="option-row">
          <div>
            <strong>Rush Drop</strong>
            <br />
            <small style={{ color: "var(--muted)" }}>20–30 minutes • Priority dispatch</small>
          </div>
          <div className="price-tag">+$10</div>
        </div>

        <h3 style={{ margin: "24px 0 12px" }}>Vehicle Type</h3>
        <div className="option-row">
          <div>
            🚗 Car / Van
            <br />
            <small style={{ color: "var(--muted)" }}>
              Small items, hardware, paint, office supplies
            </small>
          </div>
          <div className="price-tag">$6.99 – $8.99</div>
        </div>
        <div className="option-row">
          <div>
            🛻 Pickup Truck
            <br />
            <small style={{ color: "var(--muted)" }}>
              Lumber, bags of cement, medium loads
            </small>
          </div>
          <div className="price-tag">$12.99 – $14.99</div>
        </div>
        <div className="option-row">
          <div>
            🚛 Box Truck / Flatbed
            <br />
            <small style={{ color: "var(--muted)" }}>
              Heavy materials, long items, pallets
            </small>
          </div>
          <div className="price-tag">$24.99+</div>
        </div>
        <div className="option-row">
          <div>
            🚁 Drone
            <br />
            <small style={{ color: "var(--muted)" }}>
              Ultra-light & urgent only (tools, small hardware)
            </small>
          </div>
          <div className="price-tag">$12.99</div>
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 14,
            background: "var(--card)",
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          <strong>How it works</strong>
          <br />
          • Vehicle is matched to your order size and weight
          <br />
          • Distance and current demand may adjust the fee slightly
          <br />
          • Rush is available on most orders when drivers are nearby
          <br />• You see the full price before confirming
        </div>
      </div>
    </AppShell>
  );
}
