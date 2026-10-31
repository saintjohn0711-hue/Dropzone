import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { HomeBrowse } from "@/components/HomeBrowse";
import { getCatalogProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { products, source } = await getCatalogProducts();

  return (
    <AppShell>
      <BrandHeader centerLogo />
      <HomeBrowse products={products} catalogSource={source} />
    </AppShell>
  );
}
