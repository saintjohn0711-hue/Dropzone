import { NextResponse } from "next/server";
import { getHomeDepotConnectionStatus } from "@/lib/inventory";

export const runtime = "nodejs";

/** GET — Home Depot connection status (no secrets). */
export async function GET() {
  const status = getHomeDepotConnectionStatus();
  return NextResponse.json({
    ok: true,
    ...status,
    connectSteps: [
      "1. Apply: https://www.homedepot.com/c/SF_MS_Affiliate_Program_FAQs (Impact platform)",
      "2. After acceptance: Impact → Manage → My Products → Home Depot catalog → download/API URL",
      "3. On Vercel project dropzone set HOME_DEPOT_IMPACT_FEED_URL (+ optional BASIC/TOKEN auth)",
      "4. Redeploy, then POST /api/inventory/refresh or home Refresh inventory",
    ],
  });
}
