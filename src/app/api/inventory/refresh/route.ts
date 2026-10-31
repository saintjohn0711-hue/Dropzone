import { NextResponse } from "next/server";
import { runScrub } from "@/lib/inventory";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

const STORE_SEED = [
  { slug: "home-depot", name: "Home Depot", retailer: "Home Depot" },
  { slug: "lowes", name: "Lowe's", retailer: "Lowe's" },
  { slug: "local", name: "Local Suppliers", retailer: "Local" },
  { slug: "office-depot", name: "Office Depot", retailer: "Office Depot" },
];

/**
 * POST /api/inventory/refresh
 * Seeds stores if empty, then runs box-store scrubber (HD + Lowe's starter SKUs / partner feed).
 * Manual production refresh — ToS-safe structured adapters only.
 */
export async function POST(request: Request) {
  let body: { dryRun?: boolean; source?: string; limit?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const client = getWriteClient();
  let storesSeeded = 0;
  let storesNote: string | undefined;

  if (client) {
    const { count, error: countErr } = await client
      .from("stores")
      .select("id", { count: "exact", head: true });

    if (countErr) {
      storesNote = isMissingRelation(countErr)
        ? "stores table missing — run init SQL"
        : countErr.message;
    } else if ((count ?? 0) === 0) {
      const { data, error } = await client
        .from("stores")
        .upsert(STORE_SEED, { onConflict: "slug" })
        .select("id");
      if (error) storesNote = error.message;
      else storesSeeded = data?.length ?? STORE_SEED.length;
    }
  } else {
    storesNote = "Supabase admin/anon not configured";
  }

  try {
    const result = await runScrub(body.source ?? "box-store-scrubber", {
      dryRun: body.dryRun === true,
      limit: body.limit ?? 25,
    });

    return NextResponse.json({
      ok: true,
      storesSeeded,
      storesNote,
      scrub: result,
      note: "Structured Home Depot / Lowe's adapters (starter SKUs or partner API). No HTML scrape.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        storesSeeded,
        storesNote,
        hint: "Run init + inventory SQL; ensure SUPABASE_SERVICE_ROLE_KEY on Vercel.",
      },
      { status: 400 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage:
      'POST JSON { "source"?: "box-store-scrubber"|"home-depot"|"lowes", "dryRun"?: false, "limit"?: 25 }',
    note: "Seeds stores when empty, then upserts product_offers from structured adapters.",
  });
}
