import { createAdminClient } from "@/lib/supabase/admin";
import { BoxStoreScrubberSource } from "./box-store-scrubber";
import { HomeDepotInventorySource } from "./home-depot-source";
import { LowesInventorySource } from "./lowes-source";
import { SeedInventorySource } from "./seed-source";
import type {
  InventoryOffer,
  ScrubOptions,
  ScrubResult,
  StoreInventorySource,
} from "./types";

export type { InventoryOffer, ScrubOptions, ScrubResult, StoreInventorySource };
export {
  SeedInventorySource,
  BoxStoreScrubberSource,
  HomeDepotInventorySource,
  LowesInventorySource,
};

export function getInventorySources(): StoreInventorySource[] {
  return [
    new SeedInventorySource(),
    new BoxStoreScrubberSource(),
    new HomeDepotInventorySource(),
    new LowesInventorySource(),
  ];
}

export function getSource(id: string): StoreInventorySource | undefined {
  return getInventorySources().find((s) => s.id === id);
}

export async function runScrub(
  sourceId: string,
  options: ScrubOptions = {},
): Promise<ScrubResult> {
  const admin = createAdminClient();
  // Upsert when Supabase admin is available unless dryRun explicitly true
  const dryRun = options.dryRun === true || (options.dryRun !== false && !admin);
  const source = getSource(sourceId) ?? new BoxStoreScrubberSource();
  const offers = await source.fetchOffers(options);

  let persisted = 0;
  let message = dryRun
    ? `Dry-run: ${offers.length} offer(s) from ${source.id} (not written).`
    : `Fetched ${offers.length} offer(s) from ${source.id}.`;

  if (!process.env.INVENTORY_SCRUBBER_ENDPOINT) {
    message +=
      " Using structured starter SKUs (no partner API keys). Set INVENTORY_SCRUBBER_ENDPOINT + API_KEY for live feeds.";
  }

  if (!dryRun && offers.length > 0) {
    persisted = await persistOffers(offers);
    message = `Persisted ${persisted} offer(s) from ${source.id}.`;
  } else if (!dryRun && !admin) {
    message +=
      " Cannot upsert: SUPABASE_SERVICE_ROLE_KEY missing or schema not applied.";
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
      "Cannot persist: SUPABASE_SERVICE_ROLE_KEY (and URL) required. Apply init SQL first, or use dryRun:true.",
    );
  }

  const storeMeta: Record<string, string> = {
    "home-depot": "Home Depot",
    lowes: "Lowe's",
    local: "Local Suppliers",
    "office-depot": "Office Depot",
  };

  const storeSlugs = [...new Set(offers.map((o) => o.storeSlug))];
  for (const slug of storeSlugs) {
    const { error } = await admin.from("stores").upsert(
      {
        slug,
        name: storeMeta[slug] ?? slug.replace(/-/g, " "),
        retailer: storeMeta[slug] ?? slug,
      },
      { onConflict: "slug" },
    );
    if (error) throw new Error(`stores upsert: ${error.message}`);
  }

  // Best-effort products rows (catalog UI primarily reads product_offers.raw)
  const seenNames = new Set<string>();
  for (const o of offers) {
    if (seenNames.has(o.name)) continue;
    seenNames.add(o.name);
    const raw = o.raw ?? {};
    const { data: existing } = await admin
      .from("products")
      .select("id")
      .eq("name", o.name)
      .maybeSingle();
    if (!existing) {
      await admin.from("products").insert({
        name: o.name,
        category: o.category ?? "Materials",
        weight_class:
          (typeof raw.weight === "string" && raw.weight) || "medium",
        image_url: typeof raw.img === "string" ? raw.img : null,
      });
    }
  }

  const rows = offers.map((o) => ({
    sku: o.sku,
    store_slug: o.storeSlug,
    price: o.price,
    currency: o.currency,
    stock_signal: o.stockSignal,
    fetched_at: o.fetchedAt,
    raw: {
      ...(o.raw ?? {}),
      name: o.name,
      category: o.category,
    },
  }));

  const { error, data } = await admin
    .from("product_offers")
    .upsert(rows, { onConflict: "sku,store_slug" })
    .select("id");

  if (error) throw new Error(`product_offers upsert: ${error.message}`);
  return data?.length ?? rows.length;
}
