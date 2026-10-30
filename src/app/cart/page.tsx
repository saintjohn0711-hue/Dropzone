import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { CartView } from "@/components/CartView";

export default function CartPage() {
  return (
    <AppShell>
      <BrandHeader showBack />
      <div className="px-4 pb-2 pt-1">
        <h1 className="font-display text-xl font-extrabold">Your Drop</h1>
        <p className="text-sm text-dz-muted">Review items before checkout.</p>
      </div>
      <CartView />
    </AppShell>
  );
}
