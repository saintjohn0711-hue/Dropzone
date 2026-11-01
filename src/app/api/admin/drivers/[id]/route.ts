import { NextResponse } from "next/server";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/admin/constants";
import { requireAdmin } from "@/lib/admin/session";
import type { DriverStatus } from "@/lib/drivers";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const SAFE_DRIVER_SELECT =
  "id, name, display_name, email, phone, status, application_status, locale, vehicle_type, vehicle_detail, vehicle_make, vehicle_model, vehicle_year, vehicle_color, license_plate, license_plate_state, hauling_notes, service_area, availability_days, availability_hours, can_haul_heavy, weight_class, insurance_confirmed, background_check_consent, terms_accepted, contractor_ack, signature_name, signed_at, date_of_birth, address_street, address_city, address_state, address_zip, dl_number, dl_state, dl_expiration, dl_front_path, dl_back_path, dl_upload_status, admin_notes, reviewed_at, reviewed_by, application_completed_at, created_at, updated_at, drives_completed, rating_avg, rank_tier, rank_score";

/** Strip raw binary / huge payloads from admin JSON responses. */
function sanitizeDriver(row: Record<string, unknown>) {
  const out = { ...row };
  // Never echo raw base64 from application_json
  if (out.application_json && typeof out.application_json === "object") {
    const aj = { ...(out.application_json as Record<string, unknown>) };
    delete aj.dl_front_base64;
    delete aj.dl_back_base64;
    out.application_json = aj;
  }
  out.dl_front_present = Boolean(out.dl_front_path);
  out.dl_back_present = Boolean(out.dl_back_path);
  // Paths are storage keys (metadata), not public URLs — safe to show to admin
  return out;
}

export async function GET(request: Request, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }
  const { id } = await ctx.params;
  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const full = await client
    .from("drivers")
    .select(SAFE_DRIVER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (full.error) {
    const core = await client.from("drivers").select("*").eq("id", id).maybeSingle();
    if (core.error) {
      return NextResponse.json(
        {
          ok: false,
          error: core.error.message,
          hint: isMissingRelation(core.error)
            ? "Run supabase-drivers.sql"
            : undefined,
        },
        { status: isMissingRelation(core.error) ? 503 : 400 },
      );
    }
    if (!core.data) {
      return NextResponse.json({ ok: false, error: "Driver not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      driver: sanitizeDriver(core.data as Record<string, unknown>),
      soft: true,
      hint: "Some application columns missing — run supabase-admin.sql / supabase-driver-application.sql",
    });
  }

  if (!full.data) {
    return NextResponse.json({ ok: false, error: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    driver: sanitizeDriver(full.data as Record<string, unknown>),
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }
  const { id } = await ctx.params;
  let body: {
    status?: DriverStatus;
    application_status?: ApplicationStatus;
    admin_notes?: string;
    action?: "approve" | "reject" | "suspend" | "reactivate";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
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

  if (body.action === "approve") {
    patch.application_status = "approved";
    patch.status = "inactive"; // still inactive until they go online
    patch.reviewed_at = new Date().toISOString();
    patch.reviewed_by = auth.admin.email;
  } else if (body.action === "reject") {
    patch.application_status = "rejected";
    patch.status = "inactive";
    patch.reviewed_at = new Date().toISOString();
    patch.reviewed_by = auth.admin.email;
  } else if (body.action === "suspend") {
    patch.application_status = "suspended";
    patch.status = "inactive";
    patch.reviewed_at = new Date().toISOString();
    patch.reviewed_by = auth.admin.email;
  } else if (body.action === "reactivate") {
    patch.application_status = "approved";
    patch.status = "active";
    patch.reviewed_at = new Date().toISOString();
    patch.reviewed_by = auth.admin.email;
  }

  if (body.status === "active" || body.status === "inactive") {
    patch.status = body.status;
  }
  if (
    body.application_status &&
    APPLICATION_STATUSES.includes(body.application_status)
  ) {
    patch.application_status = body.application_status;
    patch.reviewed_at = new Date().toISOString();
    patch.reviewed_by = auth.admin.email;
  }
  if (typeof body.admin_notes === "string") {
    patch.admin_notes = body.admin_notes;
  }

  const { data, error } = await client
    .from("drivers")
    .update(patch)
    .eq("id", id)
    .select(SAFE_DRIVER_SELECT)
    .maybeSingle();

  if (error) {
    // Soft: only update status if application columns missing
    if (error.message.toLowerCase().includes("column") || isMissingRelation(error)) {
      const softPatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (patch.status) softPatch.status = patch.status;
      const soft = await client
        .from("drivers")
        .update(softPatch)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (soft.error) {
        return NextResponse.json(
          {
            ok: false,
            error: soft.error.message,
            hint: "Run supabase-admin.sql to enable application_status / admin_notes",
          },
          { status: 400 },
        );
      }
      return NextResponse.json({
        ok: true,
        driver: soft.data ? sanitizeDriver(soft.data as Record<string, unknown>) : null,
        soft: true,
        hint: "Updated status only — run supabase-admin.sql for full review fields",
      });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    driver: sanitizeDriver(data as Record<string, unknown>),
  });
}
