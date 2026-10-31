import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { DriverDashboard } from "@/components/DriverDashboard";

export default function DriverDashboardPage() {
  return (
    <AppShell>
      <BrandHeader titleKey="driverDashboardNav" showBack backHref="/" />
      <Suspense fallback={<p className="empty-state">…</p>}>
        <DriverDashboard />
      </Suspense>
    </AppShell>
  );
}
