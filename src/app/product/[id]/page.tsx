import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { ProductDetail } from "@/components/ProductDetail";
import { products } from "@/data/products";
import { getCatalogProduct } from "@/lib/catalog";
import { resolveProduct } from "@/lib/resolve-product";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = (await getCatalogProduct(id)) ?? resolveProduct(id);
  if (!product) notFound();

  return (
    <AppShell>
      <BrandHeader titleKey="product" showBack backHref="/" />
      <ProductDetail product={product} />
    </AppShell>
  );
}
