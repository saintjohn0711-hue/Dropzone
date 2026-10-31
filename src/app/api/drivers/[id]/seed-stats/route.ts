import { NextResponse } from "next/server";
import { loadDriverProfile } from "@/lib/driver-profile-server";

export const runtime = "nodejs";

/**
 * POST /api/drivers/:id/seed-stats
 * Force upsert realistic rank / drives / reviews for the driver profile.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await loadDriverProfile(id, { forceSeed: true });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, error: result.error, hint: result.hint },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    driver: result.driver,
    reviews: result.reviews,
    seeded: result.seeded,
    statsPersisted: result.statsPersisted,
    reviewsPersisted: result.reviewsPersisted,
    hint: result.hint,
    note: result.statsPersisted && result.reviewsPersisted
      ? "Stats and reviews persisted to Supabase."
      : "Returned seeded profile; run supabase-driver-stats.sql if persist failed.",
  });
}
