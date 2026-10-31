import { NextResponse } from "next/server";
import { getInventorySources, runScrub } from "@/lib/inventory";

export const runtime = "nodejs";

/**
 * POST /api/inventory/scrub
 * Body: { source?, storeSlug?, dryRun?, limit? }
 * Sources: seed | box-store-scrubber | home-depot | lowes
 * When SUPABASE_SERVICE_ROLE_KEY is set, omit dryRun (or dryRun:false) to upsert product_offers.
 */
export async function POST(request: Request) {
  let body: {
    source?: string;
    storeSlug?: string;
    dryRun?: boolean;
    limit?: number;
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const source = body.source ?? "box-store-scrubber";

  try {
    const result = await runScrub(source, {
      storeSlug: body.storeSlug,
      dryRun: body.dryRun,
      limit: body.limit ?? 25,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      availableSources: getInventorySources().map((s) => ({
        id: s.id,
        label: s.label,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrub failed";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint: message.includes("schema") || message.includes("relation")
          ? "Run supabase/migrations SQL in the DropZone SQL editor first."
          : undefined,
      },
      { status: 400 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage:
      'POST JSON { "source":"home-depot"|"lowes"|"box-store-scrubber"|"seed", "storeSlug"?, "dryRun"?, "limit"? }',
    availableSources: getInventorySources().map((s) => ({
      id: s.id,
      label: s.label,
    })),
    note: "Omit dryRun (or set false) to upsert when SUPABASE_SERVICE_ROLE_KEY is configured.",
  });
}
