import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

/** GET — list/search drivers for admin */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }

  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const status = searchParams.get("status"); // active|inactive
  const applicationStatus = searchParams.get("application_status");
  const vehicleType = searchParams.get("vehicle_type");
  const limit = Math.min(Number(searchParams.get("limit") || 100), 200);

  let query = client
    .from("drivers")
    .select(
      "id, name, display_name, email, phone, status, application_status, vehicle_type, vehicle_detail, vehicle_make, vehicle_model, license_plate, service_area, created_at, updated_at, reviewed_at, dl_upload_status, dl_state, dl_expiration",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status === "active" || status === "inactive") {
    query = query.eq("status", status);
  }
  if (applicationStatus) {
    query = query.eq("application_status", applicationStatus);
  }
  if (vehicleType) {
    query = query.eq("vehicle_type", vehicleType);
  }

  const { data, error } = await query;

  if (error) {
    // Soft: retry with core columns only
    if (
      isMissingRelation(error) ||
      error.message.toLowerCase().includes("column")
    ) {
      const core = await client
        .from("drivers")
        .select(
          "id, name, email, phone, status, vehicle_type, vehicle_detail, license_plate, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (core.error) {
        return NextResponse.json(
          {
            ok: false,
            error: core.error.message,
            hint: isMissingRelation(core.error)
              ? "Run supabase-drivers.sql"
              : "Run supabase-admin.sql for application_status columns",
          },
          { status: 503 },
        );
      }
      let rows = core.data || [];
      if (status === "active" || status === "inactive") {
        rows = rows.filter((d) => d.status === status);
      }
      if (vehicleType) {
        rows = rows.filter((d) => d.vehicle_type === vehicleType);
      }
      if (q) {
        rows = rows.filter(
          (d) =>
            d.name?.toLowerCase().includes(q) ||
            d.email?.toLowerCase().includes(q) ||
            d.phone?.toLowerCase().includes(q),
        );
      }
      return NextResponse.json({
        ok: true,
        drivers: rows,
        soft: true,
        hint: "Core columns only — run supabase-admin.sql + supabase-driver-application.sql",
      });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  let rows = data || [];
  if (q) {
    rows = rows.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.display_name?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q) ||
        d.service_area?.toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ ok: true, drivers: rows });
}
