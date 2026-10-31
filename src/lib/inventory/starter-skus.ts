import type { InventoryOffer, StockSignal } from "./types";

/** Curated starter SKUs for Home Depot / Lowe’s ingest (demo-aligned). Not live scrape. */
export type StarterSku = {
  sku: string;
  storeSlug: "home-depot" | "lowes";
  name: string;
  price: number;
  category: string;
  weight: "light" | "medium" | "heavy";
  stockSignal: StockSignal;
  img: string;
  eta: string;
};

export const STARTER_SKUS: StarterSku[] = [
  {
    sku: "HD-100011884",
    storeSlug: "home-depot",
    name: "2x4 Studs (8 ft) - Bundle",
    price: 24.5,
    category: "Lumber",
    weight: "heavy",
    stockSignal: "in_stock",
    img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
    eta: "45 min",
  },
  {
    sku: "HD-100153609",
    storeSlug: "home-depot",
    name: "Structural Screws #10 (200 ct)",
    price: 28.9,
    category: "Hardware",
    weight: "light",
    stockSignal: "in_stock",
    img: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80",
    eta: "35 min",
  },
  {
    sku: "HD-100187088",
    storeSlug: "home-depot",
    name: "Paint - Interior White (1 gal)",
    price: 32.4,
    category: "Paint",
    weight: "medium",
    stockSignal: "in_stock",
    img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80",
    eta: "40 min",
  },
  {
    sku: "HD-100320784",
    storeSlug: "home-depot",
    name: "Plywood 3/4 in 4x8",
    price: 48.75,
    category: "Lumber",
    weight: "heavy",
    stockSignal: "limited",
    img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
    eta: "50 min",
  },
  {
    sku: "LW-1000182467",
    storeSlug: "lowes",
    name: "Portland Cement 94 lb",
    price: 14.75,
    category: "Materials",
    weight: "heavy",
    stockSignal: "limited",
    img: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80",
    eta: "60 min",
  },
  {
    sku: "LW-1000118965",
    storeSlug: "lowes",
    name: "Drywall Sheets 4x8",
    price: 18.25,
    category: "Materials",
    weight: "heavy",
    stockSignal: "in_stock",
    img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
    eta: "55 min",
  },
  {
    sku: "LW-5001599977",
    storeSlug: "lowes",
    name: "PVC Pipe 1 in (10 ft)",
    price: 12.5,
    category: "Plumbing",
    weight: "medium",
    stockSignal: "in_stock",
    img: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80",
    eta: "45 min",
  },
  {
    sku: "LW-1000123456",
    storeSlug: "lowes",
    name: "Deck Screws #9 (5 lb)",
    price: 22.98,
    category: "Hardware",
    weight: "light",
    stockSignal: "in_stock",
    img: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80",
    eta: "40 min",
  },
];

export function starterOffers(
  storeSlug?: string,
  limit?: number,
): InventoryOffer[] {
  const now = new Date().toISOString();
  let list = STARTER_SKUS;
  if (storeSlug && storeSlug !== "all") {
    list = list.filter((s) => s.storeSlug === storeSlug);
  }
  if (limit && limit > 0) list = list.slice(0, limit);
  return list.map((s) => ({
    sku: s.sku,
    storeSlug: s.storeSlug,
    name: s.name,
    price: s.price,
    currency: "USD",
    stockSignal: s.stockSignal,
    fetchedAt: now,
    category: s.category,
    raw: {
      source: "starter-sku-feed",
      store: s.storeSlug,
      weight: s.weight,
      img: s.img,
      eta: s.eta,
      note: "Structured starter catalog — replace with partner API when available",
    },
  }));
}
