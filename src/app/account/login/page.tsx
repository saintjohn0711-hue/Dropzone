import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { CustomerLogin } from "@/components/CustomerLogin";

export default function CustomerLoginPage() {
  return (
    <AppShell>
      <BrandHeader titleKey="customerLoginTitle" showBack backHref="/" />
      <CustomerLogin />
    </AppShell>
  );
}
