import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import {
  getHomeDepotConnectionStatus,
  getLowesConnectionStatus,
  runScrub,
} from "@/lib/inventory";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }

  try {
    const result = await runScrub("box-store-scrubber", {
      dryRun: false,
      limit: 80,
    });
    return NextResponse.json({
      ok: true,
      scrub: result,
      homeDepot: result.homeDepot ?? getHomeDepotConnectionStatus(),
      lowes: result.lowes ?? getLowesConnectionStatus(),
      triggeredBy: auth.admin.email,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Refresh failed",
        homeDepot: getHomeDepotConnectionStatus(),
        lowes: getLowesConnectionStatus(),
      },
      { status: 500 },
    );
  }
}
