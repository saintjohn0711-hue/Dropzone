import { HomeDepotInventorySource } from "./home-depot-source";
import { LowesInventorySource } from "./lowes-source";
import type { InventoryOffer, ScrubOptions, StoreInventorySource } from "./types";

/**
 * Combined box-store scrubber — Home Depot + Lowe’s structured adapters.
 * Does not scrape storefront HTML; uses partner API when configured, else starter SKUs.
 */
export class BoxStoreScrubberSource implements StoreInventorySource {
  readonly id = "box-store-scrubber";
  readonly label = "Box-store inventory (Home Depot + Lowe's)";

  async fetchOffers(options: ScrubOptions = {}): Promise<InventoryOffer[]> {
    const slug = options.storeSlug;
    if (slug === "home-depot") {
      return new HomeDepotInventorySource().fetchOffers(options);
    }
    if (slug === "lowes") {
      return new LowesInventorySource().fetchOffers(options);
    }

    const [hd, lw] = await Promise.all([
      new HomeDepotInventorySource().fetchOffers(options),
      new LowesInventorySource().fetchOffers(options),
    ]);
    let merged = [...hd, ...lw];
    if (options.limit && options.limit > 0) {
      merged = merged.slice(0, options.limit);
    }
    return merged;
  }
}
