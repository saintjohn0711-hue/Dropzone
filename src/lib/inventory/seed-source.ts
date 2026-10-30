import { products } from "@/data/products";
import type { InventoryOffer, ScrubOptions, StoreInventorySource } from "./types";

/** Local seed catalog — always available without API keys. */
export class SeedInventorySource implements StoreInventorySource {
  readonly id = "seed";
  readonly label = "DropZone seed catalog";

  async fetchOffers(options: ScrubOptions = {}): Promise<InventoryOffer[]> {
    const now = new Date().toISOString();
    let offers: InventoryOffer[] = products.map((p) => ({
      sku: p.sku,
      storeSlug: p.storeSlug,
      name: p.name,
      price: p.price,
      currency: p.currency,
      stockSignal: p.stockSignal,
      fetchedAt: now,
      category: p.category,
      raw: { source: "seed", productId: p.id },
    }));

    if (options.storeSlug && options.storeSlug !== "all") {
      offers = offers.filter((o) => o.storeSlug === options.storeSlug);
    }
    if (options.limit && options.limit > 0) {
      offers = offers.slice(0, options.limit);
    }
    return offers;
  }
}
