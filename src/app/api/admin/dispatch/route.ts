import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { orderStatusForDb } from "@/lib/admin/constants";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

/** GET — active drivers for assign dropdown */
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

  const { data, error } = await client
    .from("drivers")
    .select("id, name, email, status, vehicle_type, phone")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint: isMissingRelation(error) ? "Run supabase-drivers.sql" : undefined,
      },
      { status: isMissingRelation(error) ? 503 : 400 },
    );
  }

  return NextResponse.json({ ok: true, drivers: data || [] });
}

/** POST — assign order to driver */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }

  let body: {
    orderId?: string;
    driverId?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const driverId = body.driverId?.trim();
  if (!orderId || !driverId) {
    return NextResponse.json(
      { ok: false, error: "orderId and driverId required" },
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

  const { data: driver, error: dErr } = await client
    .from("drivers")
    .select("id, name, email, status")
    .eq("id", driverId)
    .maybeSingle();

  if (dErr || !driver) {
    return NextResponse.json(
      { ok: false, error: dErr?.message || "Driver not found" },
      { status: 404 },
    );
  }
  if (driver.status !== "active") {
    return NextResponse.json(
      { ok: false, error: "Driver must be active to receive dispatches" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    assigned_driver_id: driverId,
    assigned_at: now,
    status: orderStatusForDb("assigned"),
    updated_at: now,
    dispatch_notes: body.notes?.trim() || null,
    reviewed_by: undefined,
  };
  // clean undefined
  delete patch.reviewed_by;

  let result = await client
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .maybeSingle();

  if (result.error) {
    // Soft: try legacy status + no assigned_at
    const soft = await client
      .from("orders")
      .update({
        status: "dispatched",
        updated_at: now,
      })
      .eq("id", orderId)
      .select("*")
      .maybeSingle();

    if (
      result.error.message.toLowerCase().includes("column") ||
      isMissingRelation(result.error)
    ) {
      // Try assigned_driver_id only without assigned_at / dispatch_notes
      const mid = await client
        .from("orders")
        .update({
          assigned_driver_id: driverId,
          status: "assigned",
          updated_at: now,
        })
        .eq("id", orderId)
        .select("*")
        .maybeSingle();

      if (!mid.error && mid.data) {
        return NextResponse.json({
          ok: true,
          order: mid.data,
          driver,
          soft: true,
          hint: "Partial dispatch columns — run supabase-dispatch.sql for assigned_at / driver_accepted_at.",
        });
      }

      if (!soft.error && soft.data) {
        return NextResponse.json({
          ok: true,
          order: soft.data,
          driver,
          soft: true,
          hint: "assigned_driver_id missing — status set to dispatched only. Run supabase-dispatch.sql (and supabase-admin.sql).",
        });
      }
    }

    // Retry with dispatched legacy status name
    const legacy = await client
      .from("orders")
      .update({
        assigned_driver_id: driverId,
        status: "dispatched",
        updated_at: now,
      })
      .eq("id", orderId)
      .select("*")
      .maybeSingle();

    if (!legacy.error && legacy.data) {
      return NextResponse.json({
        ok: true,
        order: legacy.data,
        driver,
        soft: true,
        hint: "Used legacy status 'dispatched'.",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: result.error.message,
        hint: "Run supabase-dispatch.sql",
      },
      { status: 400 },
    );
  }

  if (!result.data) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    order: result.data,
    driver,
    assignedBy: auth.admin.email,
  });
}
