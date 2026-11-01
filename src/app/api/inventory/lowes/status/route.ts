import { NextResponse } from "next/server";
import { getLowesConnectionStatus } from "@/lib/inventory/lowes-connection";

export const runtime = "nodejs";

export async function GET() {
  const status = getLowesConnectionStatus();
  return NextResponse.json({
    ok: true,
    ...status,
    connectSteps: [
      "1. Apply for Lowe's affiliate/partner catalog access (Impact or licensed feed)",
      "2. Copy catalog download / API URL",
      "3. On Vercel project dropzone set LOWES_IMPACT_FEED_URL (+ optional auth)",
      "4. Redeploy, then Refresh inventory or POST /api/inventory/scrub { source: \"lowes\" }",
    ],
  });
}
