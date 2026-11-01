import { NextResponse } from "next/server";
import {
  extractBearer,
  resolveDriverFromToken,
} from "@/lib/driver-session";
import { normalizeOrderStatus } from "@/lib/admin/constants";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

async function requireDriver(request: Request) {
  const token = extractBearer(request);
  if (!token) {
    return { ok: false as const, error: "Unauthorized", status: 401 };
  }
  // Soft local session: local-<uuid>
  if (token.startsWith("local-")) {
    const id = token.slice(6);
    const client = getWriteClient();
    if (client) {
      const { data } = await client
        .from("drivers")
        .select("id, name, email, status")
        .eq("id", id)
        .maybeSingle();
      if (data) return { ok: true as const, driver: data, soft: true };
    }
    return {
      ok: false as const,
      error: "Local session driver not in Supabase",
      status: 401,
    };
  }
  const resolved = await resolveDriverFromToken(token);
  if (!resolved.ok) {
    return {
      ok: false as const,
      error: resolved.error,
      status: resolved.status,
      hint: resolved.hint,
    };
  }
  return { ok: true as const, driver: resolved.driver, soft: false };
}

/** GET — jobs assigned to the logged-in driver */
export async function GET(request: Request) {
  const auth = await requireDriver(request);
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
    .from("orders")
    .select(
      "id, status, total_cents, currency, delivery_address, contact_name, vehicle_id, rush_id, payment_status, assigned_driver_id, assigned_at, driver_accepted_at, driver_started_at, driver_completed_at, dispatch_notes, created_at, updated_at",
    )
    .eq("assigned_driver_id", auth.driver.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (
      isMissingRelation(error) ||
      error.message.toLowerCase().includes("column")
    ) {
      return NextResponse.json({
        ok: true,
        jobs: [],
        soft: true,
        hint: "Run supabase-dispatch.sql so orders.assigned_driver_id exists.",
        driver: { id: auth.driver.id, name: auth.driver.name },
      });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    jobs: (data || []).map((o) => ({
      ...o,
      uiStatus: normalizeOrderStatus(String(o.status)),
    })),
    driver: { id: auth.driver.id, name: auth.driver.name, status: auth.driver.status },
  });
}

/** PATCH — accept | start | complete a job */
export async function PATCH(request: Request) {
  const auth = await requireDriver(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }

  let body: { orderId?: string; action?: "accept" | "start" | "complete" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const action = body.action;
  if (!orderId || !action) {
    return NextResponse.json(
      { ok: false, error: "orderId and action required" },
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

  const { data: order, error: oErr } = await client
    .from("orders")
    .select("id, status, assigned_driver_id")
    .eq("id", orderId)
    .maybeSingle();

  if (oErr) {
    return NextResponse.json(
      {
        ok: false,
        error: oErr.message,
        hint: isMissingRelation(oErr)
          ? "Run supabase-dispatch.sql"
          : undefined,
      },
      { status: 400 },
    );
  }
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }
  if (order.assigned_driver_id && order.assigned_driver_id !== auth.driver.id) {
    return NextResponse.json(
      { ok: false, error: "This job is assigned to another driver" },
      { status: 403 },
    );
  }
  if (!order.assigned_driver_id) {
    return NextResponse.json(
      {
        ok: false,
        error: "Order is not assigned to you",
        hint: "Ask admin to dispatch this order, or run supabase-dispatch.sql.",
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (action === "accept") {
    patch.driver_accepted_at = now;
    // stay assigned
  } else if (action === "start") {
    patch.driver_started_at = now;
    patch.status = "en_route";
  } else if (action === "complete") {
    patch.driver_completed_at = now;
    patch.status = "delivered";
  } else {
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }

  let result = await client
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .eq("assigned_driver_id", auth.driver.id)
    .select("*")
    .maybeSingle();

  if (result.error && result.error.message.toLowerCase().includes("column")) {
    // Soft: only status
    const softPatch: Record<string, unknown> = { updated_at: now };
    if (action === "start") softPatch.status = "en_route";
    if (action === "complete") softPatch.status = "delivered";
    result = await client
      .from("orders")
      .update(softPatch)
      .eq("id", orderId)
      .select("*")
      .maybeSingle();
    if (!result.error && result.data) {
      return NextResponse.json({
        ok: true,
        order: {
          ...result.data,
          uiStatus: normalizeOrderStatus(String(result.data.status)),
        },
        soft: true,
        hint: "Timestamp columns missing — run supabase-dispatch.sql",
      });
    }
  }

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: result.error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    order: result.data
      ? {
          ...result.data,
          uiStatus: normalizeOrderStatus(String(result.data.status)),
        }
      : null,
  });
}
