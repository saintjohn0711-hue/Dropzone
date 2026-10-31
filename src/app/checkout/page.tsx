import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { CheckoutView } from "@/components/CheckoutView";

export default function CheckoutPage() {
  return (
    <AppShell>
      <BrandHeader titleKey="checkoutNav" showBack backHref="/cart" />
      <CheckoutView />
    </AppShell>
  );
}
