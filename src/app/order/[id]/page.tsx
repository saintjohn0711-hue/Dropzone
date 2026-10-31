import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { OrderConfirmation } from "@/components/OrderConfirmation";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <BrandHeader titleKey="orderConfirmNav" showBack backHref="/" />
      <OrderConfirmation orderId={id} />
    </AppShell>
  );
}
