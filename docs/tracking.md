# Live order tracking

Customer-facing status after checkout: timeline **placed → assigned → en_route → delivered**, soft poll every ~8s, EN/ES, map pin at delivery address.

## URLs

| Surface | Path |
|---------|------|
| Track page | https://dropzone-seven-ecru.vercel.app/tracking?order=`<uuid>` |
| Post-checkout link | Order confirmation → **Track this drop** |
| API | `GET /api/orders/[id]/track` |

## Status mapping

Order `status` (and dispatch timestamps when present) maps via `orderToTrackingStep`:

| DB / UI status | Timeline step |
|----------------|---------------|
| pending / paid / open | `placed` |
| assigned | `assigned` |
| en_route / in_transit / started | `en_route` |
| delivered / completed | `delivered` |
| canceled | stays early + canceled badge |

## Map

1. Geocode `delivery_address` via Nominatim (best-effort).
2. If `NEXT_PUBLIC_MAPBOX_TOKEN` is set → Mapbox Static Images pin.
3. Else → OpenStreetMap static map pin.
4. If geocode fails → olive gradient placeholder with address text.

Add on Vercel project **dropzone** only (optional):

| Key | Purpose |
|-----|---------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox static map URL |

## SQL (paste later)

`/cursor/stores/self/docs/supabase-tracking.sql`  
Repo: `supabase/migrations/20261101200000_tracking.sql`

Creates optional `tracking_events` + `orders.last_lat/lon/last_tracked_at`.  
App soft-falls back if columns/table missing (uses core order + dispatch fields).

## Soft fallbacks

- Missing dispatch columns → core order select + hint to run dispatch/tracking SQL.
- Missing `tracking_events` → empty events array.
- No Mapbox → OSM static or placeholder.

## Isolation

DropZone Supabase `xvfxjxmdtazihzuyyrsj` / Vercel `prj_ePkeiDXdS9gsdYETP9ZkFuNUQeEK` only. No player1. No secrets in git.
