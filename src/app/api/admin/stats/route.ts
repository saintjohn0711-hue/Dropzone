import { NextResponse } from "next/server";
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

  const stats = {
    driversTotal: 0,
    driversActive: 0,
    driversPending: 0,
    ordersOpen: 0,
    ordersTotal: 0,
    hints: [] as string[],
  };

  const drivers = await client.from("drivers").select("id, status, application_status");
  if (drivers.error) {
    if (isMissingRelation(drivers.error)) {
      stats.hints.push("Run supabase-drivers.sql");
    } else {
      stats.hints.push(drivers.error.message);
    }
  } else {
    const rows = drivers.data || [];
    stats.driversTotal = rows.length;
    stats.driversActive = rows.filter((d) => d.status === "active").length;
    stats.driversPending = rows.filter(
      (d) => !d.application_status || d.application_status === "pending",
    ).length;
  }

  const orders = await client.from("orders").select("id, status");
  if (orders.error) {
    if (isMissingRelation(orders.error)) {
      stats.hints.push("Orders table missing — run init SQL");
    }
  } else {
    const rows = orders.data || [];
    stats.ordersTotal = rows.length;
    stats.ordersOpen = rows.filter(
      (o) =>
        !["delivered", "cancelled", "canceled"].includes(
          String(o.status || "").toLowerCase(),
        ),
    ).length;
  }

  return NextResponse.json({ ok: true, stats });
}
