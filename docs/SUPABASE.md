# DropZone Supabase setup

DropZone must use a **new** Supabase project. Do not reuse any player1 / player1-elite project or keys.

## Create the project

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → **New project**.
2. Name: **DropZone** (organization of your choice; keep it separate from player1).
3. Choose a strong DB password; note the region closest to your users.
4. Wait for the project to finish provisioning.

## Keys → Vercel + local

1. Project **Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only; never `NEXT_PUBLIC_`)
2. Copy `.env.example` → `.env.local` and fill values.
3. In Vercel project **dropzone** (`prj_ePkeiDXdS9gsdYETP9ZkFuNUQeEK`), add the same vars for Production / Preview. Do **not** copy env from player1elite or related projects.

## Apply schema

Run the SQL in `supabase/migrations/20261030000001_init.sql` via:

- Supabase **SQL Editor** → paste → Run, or
- Supabase CLI linked to this DropZone project only

Tables: `stores`, `products`, `product_offers` (sku, store_slug, price, currency, stock_signal, fetched_at), plus `carts` / `cart_items` / `orders` stubs.

## Inventory scrub

```bash
curl -X POST http://localhost:3000/api/inventory/scrub \
  -H 'content-type: application/json' \
  -d '{"source":"seed","dryRun":true}'
```

Without service-role / scrubber keys, keep `dryRun: true` (default).
