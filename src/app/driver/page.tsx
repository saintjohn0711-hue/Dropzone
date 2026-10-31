import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { DriverSignup } from "@/components/DriverSignup";

export default function DriverSignupPage() {
  return (
    <AppShell>
      <BrandHeader titleKey="driverSignupNav" showBack backHref="/" />
      <DriverSignup />
    </AppShell>
  );
}
