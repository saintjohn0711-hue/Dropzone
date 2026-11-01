import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { CustomerOrders } from "@/components/CustomerOrders";

export default function CustomerOrdersPage() {
  return (
    <AppShell>
      <BrandHeader titleKey="customerOrderHistory" showBack backHref="/account" />
      <CustomerOrders />
    </AppShell>
  );
}
