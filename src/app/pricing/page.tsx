"use client";

import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function PricingPage() {
  const { t } = useLocale();

  return (
    <AppShell>
      <BrandHeader titleKey="pricingGuide" showBack />
      <div style={{ padding: 16 }}>
        <p style={{ marginBottom: 16, color: "var(--muted)", fontSize: 14 }}>
          {t.pricingIntro}
        </p>

        <h3 style={{ marginBottom: 12 }}>{t.deliverySpeed}</h3>
        <div className="option-row">
          <div>
            <strong>{t.standard}</strong>
            <br />
            <small style={{ color: "var(--muted)" }}>{t.mostOrders}</small>
          </div>
          <div className="price-tag">$8.99 – $24.99</div>
        </div>
        <div className="option-row">
          <div>
            <strong>{t.rushDrop}</strong>
            <br />
            <small style={{ color: "var(--muted)" }}>{t.priorityDispatch}</small>
          </div>
          <div className="price-tag">+$10</div>
        </div>

        <h3 style={{ margin: "24px 0 12px" }}>{t.vehicleType}</h3>
        <div className="option-row">
          <div>
            🚗 {t.vehicleCar}
            <br />
            <small style={{ color: "var(--muted)" }}>{t.vehicleCarDesc}</small>
          </div>
          <div className="price-tag">$6.99 – $8.99</div>
        </div>
        <div className="option-row">
          <div>
            🛻 {t.vehiclePickup}
            <br />
            <small style={{ color: "var(--muted)" }}>{t.vehiclePickupDesc}</small>
          </div>
          <div className="price-tag">$12.99 – $14.99</div>
        </div>
        <div className="option-row">
          <div>
            🚛 {t.vehicleBox}
            <br />
            <small style={{ color: "var(--muted)" }}>{t.vehicleBoxDesc}</small>
          </div>
          <div className="price-tag">$24.99+</div>
        </div>
        <div className="option-row">
          <div>
            🚁 {t.vehicleDrone}
            <br />
            <small style={{ color: "var(--muted)" }}>{t.vehicleDroneDesc}</small>
          </div>
          <div className="price-tag">$12.99</div>
        </div>

        <div className="soft-card" style={{ marginTop: 24, fontSize: 13 }}>
          <strong>{t.howItWorks}</strong>
          <br />• {t.how1}
          <br />• {t.how2}
          <br />• {t.how3}
          <br />• {t.how4}
        </div>
      </div>
    </AppShell>
  );
}
