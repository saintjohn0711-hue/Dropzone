import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { DriverLogin } from "@/components/DriverLogin";

export default function DriverLoginPage() {
  return (
    <AppShell>
      <BrandHeader titleKey="driverLoginNav" showBack backHref="/" />
      <DriverLogin />
    </AppShell>
  );
}
