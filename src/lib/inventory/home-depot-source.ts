import {
  getHomeDepotConnectionStatus,
  type HomeDepotConnectionMode,
} from "./home-depot-connection";
import { starterOffers } from "./starter-skus";
import type {
  InventoryOffer,
  ScrubOptions,
  StockSignal,
  StoreInventorySource,
} from "./types";

export type HomeDepotFetchMeta = {
  mode: HomeDepotConnectionMode;
  connected: boolean;
  message: string;
};

/**
 * Home Depot inventory — ToS-safe structured feeds only.
 * Never scrapes homedepot.com HTML or bypasses bot protection.
 *
 * Priority:
 * 1. HOME_DEPOT_IMPACT_FEED_URL — Impact affiliate catalog (CSV/TSV/JSON)
 * 2. HOME_DEPOT_API_ENDPOINT + HOME_DEPOT_API_KEY — partner REST JSON
 * 3. INVENTORY_SCRUBBER_* proxy
 * 4. Curated starter SKUs
 */
export class HomeDepotInventorySource implements StoreInventorySource {
  readonly id = "home-depot";
  readonly label = "Home Depot (Impact feed / partner API / starter)";

  lastMeta: HomeDepotFetchMeta = {
    mode: "starter",
    connected: false,
    message: "Not fetched yet",
  };

  async fetchOffers(options: ScrubOptions = {}): Promise<InventoryOffer[]> {
    const status = getHomeDepotConnectionStatus();

    try {
      if (status.mode === "impact_feed") {
        const offers = await fetchImpactFeed(options.limit);
        this.lastMeta = {
          mode: "impact_feed",
          connected: true,
          message: `Impact feed returned ${offers.length} offer(s).`,
        };
        return offers;
      }

      if (status.mode === "partner_api") {
        const offers = await fetchPartnerRest(options.limit);
        this.lastMeta = {
          mode: "partner_api",
          connected: true,
          message: `Partner API returned ${offers.length} offer(s).`,
        };
        return offers;
      }

      if (status.mode === "scrubber_proxy") {
        const offers = await fetchScrubberProxy(options.limit);
        this.lastMeta = {
          mode: "scrubber_proxy",
          connected: true,
          message: `Scrubber proxy returned ${offers.length} offer(s).`,
        };
        return offers;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "HD fetch failed";
      this.lastMeta = {
        mode: "starter",
        connected: false,
        message: `Live HD fetch failed (${msg}); using starter SKUs.`,
      };
      return starterOffers("home-depot", options.limit);
    }

    this.lastMeta = {
      mode: "starter",
      connected: false,
      message: status.message,
    };
    return starterOffers("home-depot", options.limit);
  }
}

function mapStock(raw: string | undefined | null): StockSignal {
  const v = (raw || "").toLowerCase().replace(/\s+/g, "");
  if (!v) return "unknown";
  if (v.includes("instock") || v === "in_stock" || v === "available")
    return "in_stock";
  if (v.includes("limited")) return "limited";
  if (v.includes("low")) return "low";
  if (v.includes("outofstock") || v === "out" || v.includes("unavailable"))
    return "out";
  if (v.includes("preorder") || v.includes("backorder")) return "limited";
  return "unknown";
}

function inferCategory(name: string, category?: string): string {
  const blob = `${category || ""} ${name}`.toLowerCase();
  if (/lumber|2x4|2x6|plywood|osb|stud|board|timber/.test(blob)) return "Lumber";
  if (/wire|romex|breaker|outlet|electrical|led|gfci/.test(blob))
    return "Electrical";
  if (/pvc|pex|pipe|valve|plumbing|sharkbite/.test(blob)) return "Plumbing";
  if (/screw|bolt|hanger|hardware|adhesive|lag/.test(blob)) return "Hardware";
  if (/paint|primer|roller|tape/.test(blob)) return "Paint";
  if (/drywall|cement|concrete|mortar|block|compound/.test(blob))
    return "Materials";
  return category?.split(/[>/]/).pop()?.trim() || "Materials";
}

async function fetchImpactFeed(limit?: number): Promise<InventoryOffer[]> {
  const feedUrl = process.env.HOME_DEPOT_IMPACT_FEED_URL!.trim();
  const headers: HeadersInit = { Accept: "application/json, text/csv, text/plain, */*" };
  const user = process.env.HOME_DEPOT_IMPACT_USERNAME?.trim();
  const pass = process.env.HOME_DEPOT_IMPACT_PASSWORD?.trim();
  if (user && pass) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
  }
  const bearer = process.env.HOME_DEPOT_IMPACT_TOKEN?.trim();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const res = await fetch(feedUrl, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`Impact feed HTTP ${res.status}`);

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  const now = new Date().toISOString();

  let rows: Array<Record<string, string>>;
  if (contentType.includes("json") || text.trim().startsWith("[") || text.trim().startsWith("{")) {
    const parsed = JSON.parse(text) as
      | Record<string, unknown>[]
      | { items?: Record<string, unknown>[]; products?: Record<string, unknown>[] };
    const list = Array.isArray(parsed)
      ? parsed
      : parsed.items || parsed.products || [];
    rows = list.map((item) =>
      Object.fromEntries(
        Object.entries(item).map(([k, v]) => [k, v == null ? "" : String(v)]),
      ),
    );
  } else {
    rows = parseDelimited(text);
  }

  let offers: InventoryOffer[] = rows
    .map((row) => rowToOffer(row, now))
    .filter((o): o is InventoryOffer => o != null);

  if (limit && limit > 0) offers = offers.slice(0, limit);
  if (offers.length === 0) {
    throw new Error("Impact feed parsed 0 products — check URL / format");
  }
  return offers;
}

function rowToOffer(
  row: Record<string, string>,
  now: string,
): InventoryOffer | null {
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const found = Object.keys(row).find(
        (k) => k.toLowerCase().replace(/[_\s]/g, "") === key.toLowerCase().replace(/[_\s]/g, ""),
      );
      if (found && row[found]?.trim()) return row[found].trim();
    }
    return "";
  };

  const sku =
    get("Sku", "SKU", "CatalogItemId", "UniqueMerchantSKU", "ProductId", "Id") ||
    "";
  const name = get("Name", "ProductName", "Title", "ItemName");
  const priceRaw = get(
    "CurrentPrice",
    "Price",
    "SalePrice",
    "Current_Price",
    "OriginalPrice",
  );
  const price = Number(String(priceRaw).replace(/[^0-9.]/g, ""));
  if (!sku || !name || !Number.isFinite(price) || price <= 0) return null;

  const stock = mapStock(
    get("StockAvailability", "Stock", "Availability", "InStock"),
  );
  const category = inferCategory(
    name,
    get("CategoryName", "Category", "CategoryPath", "PrimaryCategory"),
  );
  const img = get("ImageUrl", "Image_URL", "Image", "LargeImage");
  const currency = get("Currency") || "USD";

  return {
    sku: sku.startsWith("HD-") ? sku : `HD-${sku}`,
    storeSlug: "home-depot",
    name,
    price,
    currency,
    stockSignal: stock,
    fetchedAt: now,
    category,
    raw: {
      source: "home-depot-impact-feed",
      img: img || undefined,
      eta: "45 min",
      weight: /cement|concrete|lumber|plywood|drywall|stud|block/i.test(name)
        ? "heavy"
        : /pipe|wire|paint|gallon/i.test(name)
          ? "medium"
          : "light",
      category,
      feedRow: row,
    },
  };
}

/** Minimal CSV/TSV parser (quoted fields supported). */
function parseDelimited(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitLine(lines[0], delim);
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delim);
    if (cols.every((c) => !c.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (cols[idx] ?? "").trim();
    });
    out.push(row);
  }
  return out;
}

function splitLine(line: string, delim: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
      continue;
    }
    if (ch === delim && !inQuotes) {
      result.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  result.push(cur);
  return result;
}

async function fetchPartnerRest(limit?: number): Promise<InventoryOffer[]> {
  const endpoint = process.env.HOME_DEPOT_API_ENDPOINT!.trim();
  const apiKey = process.env.HOME_DEPOT_API_KEY!.trim();
  const url = new URL(endpoint);
  if (limit) url.searchParams.set("limit", String(limit));
  url.searchParams.set("store", "home-depot");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(process.env.HOME_DEPOT_API_HEADER_NAME && process.env.HOME_DEPOT_API_HEADER_VALUE
        ? {
            [process.env.HOME_DEPOT_API_HEADER_NAME]:
              process.env.HOME_DEPOT_API_HEADER_VALUE,
          }
        : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Home Depot partner REST HTTP ${res.status}`);

  const body = (await res.json()) as {
    items?: Array<Record<string, unknown>>;
    products?: Array<Record<string, unknown>>;
  };
  const items = body.items || body.products || [];
  const now = new Date().toISOString();
  let offers = items
    .map((item) =>
      rowToOffer(
        Object.fromEntries(
          Object.entries(item).map(([k, v]) => [k, v == null ? "" : String(v)]),
        ),
        now,
      ),
    )
    .filter((o): o is InventoryOffer => o != null)
    .map((o) => ({
      ...o,
      raw: { ...o.raw, source: "home-depot-partner-api" },
    }));
  if (limit && limit > 0) offers = offers.slice(0, limit);
  if (!offers.length) throw new Error("Partner API returned 0 parseable items");
  return offers;
}

async function fetchScrubberProxy(limit?: number): Promise<InventoryOffer[]> {
  const apiKey = process.env.INVENTORY_SCRUBBER_API_KEY!;
  const endpoint = process.env.INVENTORY_SCRUBBER_ENDPOINT!;
  const url = new URL(endpoint);
  url.searchParams.set("store", "home-depot");
  if (limit) url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Scrubber proxy HTTP ${res.status}`);

  const body = (await res.json()) as {
    items?: Array<{
      sku: string;
      name: string;
      price: number;
      currency?: string;
      stock_signal?: StockSignal;
      category?: string;
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
    category: item.category,
    raw: { source: "scrubber-proxy", item },
  }));
}
