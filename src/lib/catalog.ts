import { createClient } from "@supabase/supabase-js";
import { products as seedProducts, type Product } from "@/data/products";
import { STARTER_SKUS } from "@/lib/inventory/starter-skus";

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const stockLabel: Record<string, string> = {
  in_stock: "In stock nearby",
  limited: "Limited stock",
  low: "Low stock",
  out: "Out of stock",
  unknown: "Stock unknown",
};

const storeName: Record<string, string> = {
  "home-depot": "Home Depot",
  lowes: "Lowe's",
  local: "Local Suppliers",
  "office-depot": "Office Depot",
};

/**
 * Prefer live product_offers from Supabase; fall back to seed/starter if empty or schema missing.
 */
export async function getCatalogProducts(): Promise<{
  products: Product[];
  source: "supabase" | "seed";
}> {
  const client = publicClient();
  if (!client) {
    return { products: seedProducts, source: "seed" };
  }

  try {
    const { data, error } = await client
      .from("product_offers")
      .select("sku, store_slug, price, currency, stock_signal, fetched_at, raw")
      .order("fetched_at", { ascending: false })
      .limit(80);

    if (error || !data || data.length === 0) {
      return { products: seedProducts, source: "seed" };
    }

    const products: Product[] = data.map((row) => {
      const raw = (row.raw ?? {}) as Record<string, unknown>;
      const starter = STARTER_SKUS.find((s) => s.sku === row.sku);
      const name =
        (typeof raw.name === "string" && raw.name) ||
        starter?.name ||
        row.sku;
      const category =
        (typeof raw.category === "string" && raw.category) ||
        starter?.category ||
        "Materials";
      const weight =
        (raw.weight as Product["weight"]) || starter?.weight || "medium";
      const img =
        (typeof raw.img === "string" && raw.img) ||
        starter?.img ||
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80";
      const eta =
        (typeof raw.eta === "string" && raw.eta) || starter?.eta || "45 min";
      const signal = (row.stock_signal as string) || "unknown";

      return {
        id: row.sku,
        name,
        store: storeName[row.store_slug] ?? row.store_slug,
        storeSlug: row.store_slug,
        sku: row.sku,
        price: Number(row.price),
        currency: row.currency || "USD",
        eta,
        category,
        weight,
        img,
        stock: stockLabel[signal] ?? signal,
        stockSignal:
          signal === "in_stock" || signal === "limited" || signal === "low"
            ? signal
            : "limited",
      };
    });

    // Dedupe by sku keeping first (newest fetched_at order)
    const seen = new Set<string>();
    const unique = products.filter((p) => {
      if (seen.has(p.sku)) return false;
      seen.add(p.sku);
      return true;
    });

    return { products: unique, source: "supabase" };
  } catch {
    return { products: seedProducts, source: "seed" };
  }
}

export async function getCatalogProduct(id: string): Promise<Product | undefined> {
  const { products } = await getCatalogProducts();
  return products.find((p) => p.id === id || p.sku === id);
}
