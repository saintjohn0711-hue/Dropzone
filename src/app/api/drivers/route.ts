import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import type { DriverSignupInput, VehicleType } from "@/lib/drivers";

export const runtime = "nodejs";

const VEHICLES: VehicleType[] = ["car", "pickup", "box_truck", "drone"];

function writeClient() {
  return createAdminClient() ?? publicClient();
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** POST — create a DropZone driver account */
export async function POST(request: Request) {
  let body: DriverSignupInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const vehicle_type = body.vehicle_type;

  if (!name || !email || !vehicle_type) {
    return NextResponse.json(
      { ok: false, error: "name, email, and vehicle_type are required" },
      { status: 400 },
    );
  }
  if (!VEHICLES.includes(vehicle_type)) {
    return NextResponse.json(
      { ok: false, error: `vehicle_type must be one of: ${VEHICLES.join(", ")}` },
      { status: 400 },
    );
  }

  const client = writeClient();
  if (!client) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase not configured",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL + anon/service key, then run drivers SQL.",
      },
      { status: 503 },
    );
  }

  const row = {
    name,
    email,
    phone: body.phone?.trim() || null,
    vehicle_type,
    vehicle_detail: body.vehicle_detail?.trim() || null,
    license_plate: body.license_plate?.trim() || null,
    status: "inactive" as const,
    locale: body.locale === "es" ? "es" : "en",
  };

  const { data, error } = await client.from("drivers").insert(row).select("*").single();

  if (error) {
    const missing =
      error.code === "PGRST205" ||
      error.message.includes("schema cache") ||
      error.message.includes("does not exist");
    const conflict = error.code === "23505" || error.message.includes("duplicate");
    return NextResponse.json(
      {
        ok: false,
        error: conflict ? "A driver with this email already exists" : error.message,
        hint: missing
          ? "Run docs/supabase-drivers.sql (or migrations/20261031000002_drivers.sql) in the DropZone SQL editor."
          : undefined,
      },
      { status: missing ? 503 : conflict ? 409 : 400 },
    );
  }

  return NextResponse.json({ ok: true, driver: data });
}

/** GET — list drivers or fetch by ?id= / ?email= */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email")?.toLowerCase();

  const client = writeClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 },
    );
  }

  let query = client.from("drivers").select("*");
  if (id) query = query.eq("id", id);
  else if (email) query = query.eq("email", email);
  else query = query.order("created_at", { ascending: false }).limit(50);

  const { data, error } = id || email ? await query.maybeSingle() : await query;

  if (error) {
    const missing =
      error.code === "PGRST205" || error.message.includes("schema cache");
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint: missing
          ? "Run supabase-drivers.sql in DropZone project xvfxjxmdtazihzuyyrsj SQL editor."
          : undefined,
      },
      { status: missing ? 503 : 400 },
    );
  }

  if ((id || email) && !data) {
    return NextResponse.json({ ok: false, error: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    driver: id || email ? data : undefined,
    drivers: id || email ? undefined : data,
  });
}
