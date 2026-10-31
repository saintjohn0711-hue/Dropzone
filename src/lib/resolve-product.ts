import { products, type Product } from "@/data/products";
import { STARTER_SKUS } from "@/lib/inventory/starter-skus";

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

/** Client-safe product lookup (seed + starter SKUs). */
export function resolveProduct(id: string): Product | undefined {
  const fromSeed = products.find((p) => p.id === id || p.sku === id);
  if (fromSeed) return fromSeed;

  const starter = STARTER_SKUS.find((s) => s.sku === id);
  if (!starter) return undefined;

  return {
    id: starter.sku,
    name: starter.name,
    store: storeName[starter.storeSlug] ?? starter.storeSlug,
    storeSlug: starter.storeSlug,
    sku: starter.sku,
    price: starter.price,
    currency: "USD",
    eta: starter.eta,
    category: starter.category,
    weight: starter.weight,
    img: starter.img,
    stock: stockLabel[starter.stockSignal] ?? starter.stockSignal,
    stockSignal:
      starter.stockSignal === "in_stock" ||
      starter.stockSignal === "limited" ||
      starter.stockSignal === "low"
        ? starter.stockSignal
        : "limited",
  };
}
