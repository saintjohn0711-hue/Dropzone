import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { CustomerAccount } from "@/components/CustomerAccount";

export default function CustomerAccountPage() {
  return (
    <AppShell>
      <BrandHeader titleKey="customerAccountTitle" showBack backHref="/" />
      <Suspense fallback={<p className="empty-state">Loading…</p>}>
        <CustomerAccount />
      </Suspense>
    </AppShell>
  );
}
