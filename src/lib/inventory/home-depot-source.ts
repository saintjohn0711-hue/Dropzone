import { starterOffers } from "./starter-skus";
import type { InventoryOffer, ScrubOptions, StoreInventorySource } from "./types";

/**
 * Home Depot inventory source.
 * Prefer official partner / affiliate APIs when INVENTORY_SCRUBBER_* is set.
 * Otherwise returns curated starter SKUs (no HTML scrape — ToS-safe).
 */
export class HomeDepotInventorySource implements StoreInventorySource {
  readonly id = "home-depot";
  readonly label = "Home Depot (structured feed / starter SKUs)";

  async fetchOffers(options: ScrubOptions = {}): Promise<InventoryOffer[]> {
    const fromPartner = await fetchPartner("home-depot", options);
    if (fromPartner) return fromPartner;
    return starterOffers("home-depot", options.limit);
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
  if (!res.ok) throw new Error(`Home Depot partner feed HTTP ${res.status}`);

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
    storeSlug: "home-depot",
    name: item.name,
    price: item.price,
    currency: item.currency ?? "USD",
    stockSignal: item.stock_signal ?? "unknown",
    fetchedAt: now,
    raw: { source: "partner-api", store, item },
  }));
}
