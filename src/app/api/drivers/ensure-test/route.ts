import { NextResponse } from "next/server";
import { loadDriverProfile } from "@/lib/driver-profile-server";
import { TEST_DRIVER } from "@/lib/test-driver";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

/**
 * POST /api/drivers/ensure-test
 * Upserts the documented demo driver (driver@dropzone.test) and seeds stats when possible.
 */
export async function POST() {
  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const email = TEST_DRIVER.email;
  const { data: existing, error: findErr } = await client
    .from("drivers")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (findErr && isMissingRelation(findErr)) {
    return NextResponse.json(
      {
        ok: false,
        error: findErr.message,
        hint: "Run supabase-drivers.sql first.",
        testEmail: email,
      },
      { status: 503 },
    );
  }

  let driver = existing;
  if (!driver) {
    const { data, error } = await client
      .from("drivers")
      .insert({
        name: TEST_DRIVER.name,
        email,
        phone: TEST_DRIVER.phone,
        vehicle_type: TEST_DRIVER.vehicle_type,
        vehicle_detail: TEST_DRIVER.vehicle_detail,
        license_plate: TEST_DRIVER.license_plate,
        status: "inactive",
        locale: TEST_DRIVER.locale,
      })
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Could not create test driver", testEmail: email },
        { status: 400 },
      );
    }
    driver = data;
  }

  const profile = await loadDriverProfile(driver.id, { forceSeed: true });
  if (!("error" in profile)) {
    return NextResponse.json({
      ok: true,
      created: !existing,
      testEmail: email,
      passwordNote: TEST_DRIVER.passwordNote,
      driver: profile.driver,
      reviews: profile.reviews,
      statsPersisted: profile.statsPersisted,
      reviewsPersisted: profile.reviewsPersisted,
      hint: profile.hint,
    });
  }

  return NextResponse.json({
    ok: true,
    created: !existing,
    testEmail: email,
    passwordNote: TEST_DRIVER.passwordNote,
    driver,
    hint: profile.hint || profile.error,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    testEmail: TEST_DRIVER.email,
    passwordNote: TEST_DRIVER.passwordNote,
    usage: "POST to upsert demo driver",
  });
}
