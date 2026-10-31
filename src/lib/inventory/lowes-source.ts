import { starterOffers } from "./starter-skus";
import type { InventoryOffer, ScrubOptions, StoreInventorySource } from "./types";

/**
 * Lowe’s inventory source.
 * Prefer official partner APIs when INVENTORY_SCRUBBER_* is set.
 * Otherwise returns curated starter SKUs (no HTML scrape — ToS-safe).
 */
export class LowesInventorySource implements StoreInventorySource {
  readonly id = "lowes";
  readonly label = "Lowe's (structured feed / starter SKUs)";

  async fetchOffers(options: ScrubOptions = {}): Promise<InventoryOffer[]> {
    const fromPartner = await fetchPartner("lowes", options);
    if (fromPartner) return fromPartner;
    return starterOffers("lowes", options.limit);
  }
}

async function fetchPartner(
  store: string,
  options: ScrubOptions,
): Promise<InventoryOffer[] | null> {
  const apiKey = process.env.INVENTORY_SCRUBBER_API_KEY;
  const endpoint = process.env.INVENTORY_SCRUBBER_ENDPOINT;
  if (!apiKey || !endpoint) return null;

  const url = new URL(endpoint);
  url.searchParams.set("store", store);
  if (options.limit) url.searchParams.set("limit", String(options.limit));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Lowe's partner feed HTTP ${res.status}`);

  const body = (await res.json()) as {
    items?: Array<{
      sku: string;
      name: string;
      price: number;
      currency?: string;
      stock_signal?: InventoryOffer["stockSignal"];
    }>;
  };
  const now = new Date().toISOString();
  return (body.items ?? []).map((item) => ({
    sku: item.sku,
    storeSlug: "lowes",
    name: item.name,
    price: item.price,
    currency: item.currency ?? "USD",
    stockSignal: item.stock_signal ?? "unknown",
    fetchedAt: now,
    raw: { source: "partner-api", store, item },
  }));
}
