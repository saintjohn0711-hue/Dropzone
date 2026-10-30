import type { InventoryOffer, ScrubOptions, StoreInventorySource } from "./types";

/**
 * Skeleton scrubber for public box-store product numbers + prices.
 * Respect robots/ToS; prefer official partner APIs when available.
 * Without SCRUBBER_* keys this source returns an empty set (safe dry-run).
 */
export class BoxStoreScrubberSource implements StoreInventorySource {
  readonly id = "box-store-scrubber";
  readonly label = "Box-store inventory scrubber (skeleton)";

  async fetchOffers(options: ScrubOptions = {}): Promise<InventoryOffer[]> {
    const apiKey = process.env.INVENTORY_SCRUBBER_API_KEY;
    const endpoint = process.env.INVENTORY_SCRUBBER_ENDPOINT;

    if (!apiKey || !endpoint) {
      // Dry-run without keys: no network, empty offers — caller reports skeleton mode.
      return [];
    }

    // Placeholder for partner/API integration. Do not scrape when keys missing.
    const store = options.storeSlug ?? "home-depot";
    const url = new URL(endpoint);
    url.searchParams.set("store", store);
    if (options.limit) url.searchParams.set("limit", String(options.limit));

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Box-store scrubber HTTP ${res.status}`);
    }

    const body = (await res.json()) as {
      items?: Array<{
        sku: string;
        store_slug?: string;
        name: string;
        price: number;
        currency?: string;
        stock_signal?: InventoryOffer["stockSignal"];
      }>;
    };

    const now = new Date().toISOString();
    return (body.items ?? []).map((item) => ({
      sku: item.sku,
      storeSlug: item.store_slug ?? store,
      name: item.name,
      price: item.price,
      currency: item.currency ?? "USD",
      stockSignal: item.stock_signal ?? "unknown",
      fetchedAt: now,
      raw: { source: "box-store-scrubber", item },
    }));
  }
}
