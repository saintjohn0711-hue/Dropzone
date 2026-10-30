import { NextResponse } from "next/server";
import { getInventorySources, runScrub } from "@/lib/inventory";

export const runtime = "nodejs";

/**
 * POST /api/inventory/scrub
 * Body: { source?: "seed" | "box-store-scrubber", storeSlug?: string, dryRun?: boolean, limit?: number }
 * Defaults to dryRun:true so the endpoint works without Supabase / scrubber keys.
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

  const source = body.source ?? "seed";
  const dryRun = body.dryRun !== false;

  try {
    const result = await runScrub(source, {
      storeSlug: body.storeSlug,
      dryRun,
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
    return NextResponse.json({ ok: false, error: message, dryRun }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage: "POST with JSON { source, storeSlug, dryRun, limit }",
    availableSources: getInventorySources().map((s) => ({
      id: s.id,
      label: s.label,
    })),
    note: "dryRun defaults to true and works without Supabase or scrubber keys.",
  });
}
