import { createAdminClient } from "@/lib/supabase/admin";
import { BoxStoreScrubberSource } from "./box-store-scrubber";
import { SeedInventorySource } from "./seed-source";
import type {
  InventoryOffer,
  ScrubOptions,
  ScrubResult,
  StoreInventorySource,
} from "./types";

export type { InventoryOffer, ScrubOptions, ScrubResult, StoreInventorySource };
export { SeedInventorySource, BoxStoreScrubberSource };

export function getInventorySources(): StoreInventorySource[] {
  return [new SeedInventorySource(), new BoxStoreScrubberSource()];
}

export function getSource(id: string): StoreInventorySource | undefined {
  return getInventorySources().find((s) => s.id === id);
}

export async function runScrub(
  sourceId: string,
  options: ScrubOptions = {},
): Promise<ScrubResult> {
  const dryRun = options.dryRun !== false; // default dry-run
  const source = getSource(sourceId) ?? new SeedInventorySource();
  const offers = await source.fetchOffers(options);

  let persisted = 0;
  let message = dryRun
    ? `Dry-run: ${offers.length} offer(s) from ${source.id} (not written).`
    : `Fetched ${offers.length} offer(s) from ${source.id}.`;

  if (source.id === "box-store-scrubber" && offers.length === 0) {
    message +=
      " Scrubber skeleton: set INVENTORY_SCRUBBER_ENDPOINT + INVENTORY_SCRUBBER_API_KEY to enable live fetch.";
  }

  if (!dryRun && offers.length > 0) {
    persisted = await persistOffers(offers);
    message = `Persisted ${persisted} offer(s) from ${source.id}.`;
  }

  return {
    source: source.id,
    dryRun,
    offers,
    persisted,
    message,
  };
}

async function persistOffers(offers: InventoryOffer[]): Promise<number> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "Cannot persist: SUPABASE_SERVICE_ROLE_KEY (and URL) required. Use dryRun:true without keys.",
    );
  }

  const storeSlugs = [...new Set(offers.map((o) => o.storeSlug))];
  for (const slug of storeSlugs) {
    await admin.from("stores").upsert(
      { slug, name: slug.replace(/-/g, " ") },
      { onConflict: "slug" },
    );
  }

  const rows = offers.map((o) => ({
    sku: o.sku,
    store_slug: o.storeSlug,
    price: o.price,
    currency: o.currency,
    stock_signal: o.stockSignal,
    fetched_at: o.fetchedAt,
    raw: o.raw ?? null,
  }));

  const { error, data } = await admin
    .from("product_offers")
    .upsert(rows, { onConflict: "sku,store_slug" })
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? rows.length;
}
