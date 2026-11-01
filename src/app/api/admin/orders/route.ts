import { NextResponse } from "next/server";
import { normalizeOrderStatus } from "@/lib/admin/constants";
import { requireAdmin } from "@/lib/admin/session";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

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
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  let query = client
    .from("orders")
    .select(
      "id, status, total_cents, currency, delivery_address, contact_name, vehicle_id, rush_id, subtotal_cents, delivery_fee_cents, admin_notes, assigned_driver_id, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    const n = normalizeOrderStatus(status);
    // Match aliases
    if (n === "placed") query = query.in("status", ["placed", "pending", "draft"]);
    else if (n === "assigned")
      query = query.in("status", ["assigned", "dispatched"]);
    else if (n === "canceled")
      query = query.in("status", ["canceled", "cancelled"]);
    else query = query.eq("status", n);
  }

  const { data, error } = await query;
  if (error) {
    if (
      isMissingRelation(error) ||
      error.message.toLowerCase().includes("column")
    ) {
      const core = await client
        .from("orders")
        .select(
          "id, status, total_cents, currency, delivery_address, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (core.error) {
        return NextResponse.json(
          {
            ok: false,
            error: core.error.message,
            hint: "Orders table missing — run init / checkout SQL",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({
        ok: true,
        orders: (core.data || []).map((o) => ({
          ...o,
          uiStatus: normalizeOrderStatus(String(o.status)),
        })),
        soft: true,
      });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    orders: (data || []).map((o) => ({
      ...o,
      uiStatus: normalizeOrderStatus(String(o.status)),
    })),
  });
}
