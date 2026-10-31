import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import type { DriverStatus, VehicleType } from "@/lib/drivers";

export const runtime = "nodejs";

const VEHICLES: VehicleType[] = ["car", "pickup", "box_truck", "drone"];

function writeClient() {
  const admin = createAdminClient();
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

  const client = writeClient();
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
    const missing =
      error.code === "PGRST205" || error.message.includes("schema cache");
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const client = writeClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { data, error } = await client
    .from("drivers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Driver not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, driver: data });
}
