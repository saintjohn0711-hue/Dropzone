import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { getHomeDepotConnectionStatus } from "@/lib/inventory/home-depot-connection";
import { getLowesConnectionStatus } from "@/lib/inventory/lowes-connection";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }
  return NextResponse.json({
    ok: true,
    homeDepot: getHomeDepotConnectionStatus(),
    lowes: getLowesConnectionStatus(),
  });
}
