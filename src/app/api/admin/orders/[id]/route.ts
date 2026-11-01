import { NextResponse } from "next/server";
import {
  ORDER_STATUSES,
  orderStatusForDb,
  normalizeOrderStatus,
} from "@/lib/admin/constants";
import { requireAdmin } from "@/lib/admin/session";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

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

  const { data, error } = await client
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint: isMissingRelation(error) ? "Run init SQL for orders" : undefined,
      },
      { status: isMissingRelation(error) ? 503 : 400 },
    );
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    order: { ...data, uiStatus: normalizeOrderStatus(String(data.status)) },
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
    status?: string;
    admin_notes?: string;
    assigned_driver_id?: string | null;
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

  if (body.status) {
    const n = normalizeOrderStatus(body.status);
    if (!ORDER_STATUSES.includes(n) && body.status !== "draft") {
      return NextResponse.json(
        {
          ok: false,
          error: `status must be one of: ${ORDER_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    patch.status = orderStatusForDb(body.status);
  }
  if (typeof body.admin_notes === "string") patch.admin_notes = body.admin_notes;
  if (body.assigned_driver_id !== undefined) {
    patch.assigned_driver_id = body.assigned_driver_id;
  }

  // Try preferred status names; fall back to legacy pending/dispatched/cancelled
  let result = await client
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (result.error && patch.status) {
    const legacy: Record<string, string> = {
      placed: "pending",
      assigned: "dispatched",
      canceled: "cancelled",
    };
    const mapped = legacy[String(patch.status)];
    if (mapped) {
      result = await client
        .from("orders")
        .update({ ...patch, status: mapped })
        .eq("id", id)
        .select("*")
        .maybeSingle();
    }
  }

  if (result.error) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error.message,
        hint: isMissingRelation(result.error)
          ? "Run supabase-admin.sql to extend order statuses"
          : undefined,
      },
      { status: 400 },
    );
  }
  if (!result.data) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    order: {
      ...result.data,
      uiStatus: normalizeOrderStatus(String(result.data.status)),
    },
  });
}
