import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { ProductDetail } from "@/components/ProductDetail";
import { getProduct, products } from "@/data/products";

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  return (
    <AppShell>
      <BrandHeader titleKey="product" showBack backHref="/" />
      <ProductDetail product={product} />
    </AppShell>
  );
}
