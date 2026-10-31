import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { CartView } from "@/components/CartView";

export default function CartPage() {
  return (
    <AppShell>
      <BrandHeader titleKey="yourCart" />
      <CartView />
    </AppShell>
  );
}
