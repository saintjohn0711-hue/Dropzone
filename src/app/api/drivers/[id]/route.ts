import { NextResponse } from "next/server";
import type { DriverStatus, VehicleType } from "@/lib/drivers";
import { loadDriverProfile } from "@/lib/driver-profile-server";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

const VEHICLES: VehicleType[] = ["car", "pickup", "box_truck", "drone"];

/** PATCH — update driver profile / active|inactive status */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let body: {
    status?: DriverStatus;
    name?: string;
    phone?: string;
    vehicle_type?: VehicleType;
    vehicle_detail?: string;
    license_plate?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status && body.status !== "active" && body.status !== "inactive") {
    return NextResponse.json(
      { ok: false, error: "status must be active or inactive" },
      { status: 400 },
    );
  }
  if (body.vehicle_type && !VEHICLES.includes(body.vehicle_type)) {
    return NextResponse.json(
      { ok: false, error: `vehicle_type must be one of: ${VEHICLES.join(", ")}` },
      { status: 400 },
    );
  }

  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.status) patch.status = body.status;
  if (body.name?.trim()) patch.name = body.name.trim();
  if (body.phone !== undefined) patch.phone = body.phone.trim() || null;
  if (body.vehicle_type) patch.vehicle_type = body.vehicle_type;
  if (body.vehicle_detail !== undefined)
    patch.vehicle_detail = body.vehicle_detail.trim() || null;
  if (body.license_plate !== undefined)
    patch.license_plate = body.license_plate.trim() || null;

  const { data, error } = await client
    .from("drivers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    const missing = isMissingRelation(error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint: missing
          ? "Run supabase-drivers.sql in the DropZone SQL editor first."
          : undefined,
      },
      { status: missing ? 503 : 400 },
    );
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, driver: data });
}

/** GET — driver profile with rank/drives + best reviews (seeds when empty) */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const forceSeed = new URL(request.url).searchParams.get("seed") === "1";
  const result = await loadDriverProfile(id, { forceSeed });

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
  });
}
