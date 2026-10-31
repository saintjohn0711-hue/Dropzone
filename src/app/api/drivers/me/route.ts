import { NextResponse } from "next/server";
import { loadDriverProfile } from "@/lib/driver-profile-server";
import { extractBearer, resolveDriverFromToken } from "@/lib/driver-session";

export const runtime = "nodejs";

/** GET — current driver from session cookie or Bearer token */
export async function GET(request: Request) {
  const token = extractBearer(request);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Not signed in" },
      { status: 401 },
    );
  }

  const resolved = await resolveDriverFromToken(token);
  if (!resolved.ok) {
    return NextResponse.json(
      { ok: false, error: resolved.error, hint: resolved.hint },
      { status: resolved.status },
    );
  }

  const profile = await loadDriverProfile(resolved.driver.id);
  if ("error" in profile) {
    return NextResponse.json(
      {
        ok: true,
        driver: resolved.driver,
        reviews: [],
        authenticated: true,
      },
    );
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    driver: profile.driver,
    reviews: profile.reviews,
    seeded: profile.seeded,
    hint: profile.hint,
  });
}
