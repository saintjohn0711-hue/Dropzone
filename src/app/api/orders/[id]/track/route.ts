import { NextResponse } from "next/server";
import { normalizeOrderStatus } from "@/lib/admin/constants";
import { geocodeAddress, getMapMode, staticMapUrl } from "@/lib/tracking/map";
import { orderToTrackingStep } from "@/lib/tracking/status";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

type TrackOrderRow = {
  id: string;
  status: string | null;
  total_cents?: number | null;
  currency?: string | null;
  delivery_address?: string | null;
  contact_name?: string | null;
  vehicle_id?: string | null;
  rush_id?: string | null;
  payment_status?: string | null;
  assigned_driver_id?: string | null;
  assigned_at?: string | null;
  driver_accepted_at?: string | null;
  driver_started_at?: string | null;
  driver_completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const fullSelect =
    "id, status, total_cents, currency, delivery_address, contact_name, vehicle_id, rush_id, payment_status, assigned_driver_id, assigned_at, driver_accepted_at, driver_started_at, driver_completed_at, created_at, updated_at";
  const midSelect =
    "id, status, total_cents, currency, delivery_address, assigned_driver_id, payment_status, created_at, updated_at";
  const coreSelect =
    "id, status, total_cents, currency, delivery_address, created_at, updated_at";

  const { data: order, error } = await client
    .from("orders")
    .select(fullSelect)
    .eq("id", id)
    .maybeSingle();

  let softOrder = order as TrackOrderRow | null;
  let hint: string | undefined;

  if (error) {
    if (
      isMissingRelation(error) ||
      error.message.toLowerCase().includes("column")
    ) {
      const mid = await client
        .from("orders")
        .select(midSelect)
        .eq("id", id)
        .maybeSingle();
      if (!mid.error && mid.data) {
        softOrder = mid.data as TrackOrderRow;
        hint =
          "Some order columns missing — run supabase-checkout.sql / supabase-dispatch.sql / supabase-tracking.sql";
      } else {
        const core = await client
          .from("orders")
          .select(coreSelect)
          .eq("id", id)
          .maybeSingle();
        if (core.error) {
          return NextResponse.json(
            {
              ok: false,
              error: core.error.message,
              hint: "Run init / checkout SQL for orders",
            },
            { status: 503 },
          );
        }
        softOrder = core.data as TrackOrderRow | null;
        hint =
          "Minimal order row — run checkout + dispatch + tracking SQL for full live tracking";
      }
    } else {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
  }

  if (!softOrder) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  let driver: {
    id: string;
    name: string;
    phone: string | null;
    vehicle_type: string | null;
    vehicle_detail: string | null;
    license_plate: string | null;
    rating_avg: number | null;
  } | null = null;

  const driverId = (softOrder as { assigned_driver_id?: string }).assigned_driver_id;
  if (driverId) {
    const { data: d } = await client
      .from("drivers")
      .select(
        "id, name, phone, vehicle_type, vehicle_detail, license_plate, rating_avg",
      )
      .eq("id", driverId)
      .maybeSingle();
    if (d) driver = d;
  }

  const address = softOrder.delivery_address || "";
  const coords = address ? await geocodeAddress(address) : null;
  const mapMode = getMapMode();
  const mapImageUrl = coords ? staticMapUrl(coords) : null;

  const uiStatus = normalizeOrderStatus(String(softOrder.status));
  const step = orderToTrackingStep(String(softOrder.status));

  // Optional tracking_events table (soft)
  let events: Array<{ status: string; note: string | null; created_at: string }> =
    [];
  const ev = await client
    .from("tracking_events")
    .select("status, note, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });
  if (!ev.error && ev.data) events = ev.data;
  else if (ev.error && !isMissingRelation(ev.error)) {
    /* ignore missing table */
  }

  return NextResponse.json({
    ok: true,
    order: {
      ...softOrder,
      uiStatus,
      step,
    },
    driver,
    map: {
      mode: mapMode.mode,
      message: mapMode.message,
      coords,
      imageUrl: mapImageUrl,
      address,
    },
    events,
    hint,
    polledAt: new Date().toISOString(),
  });
}
