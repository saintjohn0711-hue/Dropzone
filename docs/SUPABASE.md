# DropZone Supabase setup

DropZone must use a **new** Supabase project. Do not reuse any player1 / player1-elite project or keys.

**Live project:** `xvfxjxmdtazihzuyyrsj` · [SQL Editor](https://supabase.com/dashboard/project/xvfxjxmdtazihzuyyrsj/sql/new)

## Keys → Vercel + local

1. Project **Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only; never `NEXT_PUBLIC_`)
2. Copy `.env.example` → `.env.local` and fill values.
3. In Vercel project **dropzone** (`prj_ePkeiDXdS9gsdYETP9ZkFuNUQeEK`), add the same vars for Production / Preview. Do **not** copy env from player1elite or related projects.

## Apply schema (required — agent cannot DDL)

Paste and **Run** in the DropZone SQL Editor:

1. `supabase/migrations/20261030000001_init.sql` — stores, products, product_offers, carts, orders, **drivers**
2. Or drivers-only: `supabase/migrations/20261031000002_drivers.sql`

Tables: `stores`, `products`, `product_offers`, `carts`, `cart_items`, `orders`, `drivers` (status `active` | `inactive`).

## Inventory scrub (Home Depot / Lowe’s)

Structured adapters only (partner API when `INVENTORY_SCRUBBER_*` set; otherwise curated starter SKUs — **no HTML scrape**).

```bash
# Dry-run starter SKUs
curl -X POST https://dropzone-seven-ecru.vercel.app/api/inventory/scrub \
  -H 'content-type: application/json' \
  -d '{"source":"home-depot","dryRun":true}'

# Upsert when service role + schema exist
curl -X POST https://dropzone-seven-ecru.vercel.app/api/inventory/scrub \
  -H 'content-type: application/json' \
  -d '{"source":"box-store-scrubber","dryRun":false}'
```

Sources: `seed` | `box-store-scrubber` | `home-depot` | `lowes`

Home catalog reads `product_offers` from Supabase when rows exist; otherwise falls back to the seed demo list.

## Drivers API

- `POST /api/drivers` — signup (starts `inactive`)
- `GET /api/drivers?id=` / `?email=` — lookup
- `PATCH /api/drivers/:id` — toggle `status` to `active` | `inactive`
- UI: `/driver` (signup), `/driver/dashboard` (profile + toggle)
