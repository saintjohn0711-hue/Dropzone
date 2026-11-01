# Lowe's inventory (ToS-safe)

DropZone does **not** scrape lowes.com or bypass bot protection.

Mirrors the Home Depot adapter: Impact/affiliate feed → partner REST → scrubber proxy → curated starter SKUs.

## Official path (recommended)

1. Apply for Lowe's affiliate / partner catalog access (Impact or licensed feed).
2. Obtain a daily product catalog download or API URL (CSV/TSV/JSON).
3. Prefer fields like `Sku`, `Name`, `Current Price`, `Stock Availability`, `Image Url`, `Category Name`.
4. Set env on Vercel project **dropzone** only, redeploy, then Refresh inventory.

### Env vars (Vercel **dropzone** only — never player1)

| Key | Required | Purpose |
|-----|----------|---------|
| `LOWES_IMPACT_FEED_URL` | Yes for live Lowe's | HTTPS URL to Impact/partner catalog (CSV/JSON) |
| `LOWES_IMPACT_USERNAME` | Optional | Basic auth user |
| `LOWES_IMPACT_PASSWORD` | Optional | Basic auth password |
| `LOWES_IMPACT_TOKEN` | Optional | Bearer token |

Add under Vercel → Project **dropzone** (`prj_ePkeiDXdS9gsdYETP9ZkFuNUQeEK`) → Settings → Environment Variables → Production (+ Preview). Redeploy after saving.

## Alternate: partner REST JSON

Licensed partner/aggregator returning `{ items: [{ sku, name, price, stock_signal, category }] }`:

| Key | Required |
|-----|----------|
| `LOWES_API_ENDPOINT` | Yes |
| `LOWES_API_KEY` | Yes (Bearer) |
| `LOWES_API_HEADER_NAME` / `LOWES_API_HEADER_VALUE` | Optional extra header |

Or reuse the generic proxy:

| Key | Purpose |
|-----|---------|
| `INVENTORY_SCRUBBER_ENDPOINT` | GET `?store=lowes` |
| `INVENTORY_SCRUBBER_API_KEY` | Bearer |

**Do not** use SerpApi / HTML scrapers against lowes.com for this project.

## How Refresh works

1. Home **Refresh inventory** → `POST /api/inventory/refresh` (box-store = HD + Lowe's)
2. Or `POST /api/inventory/scrub` with `{ "source": "lowes", "dryRun": false }`
3. Adapter picks Impact → partner REST → scrubber → **starter SKUs** (`LW-` SKU prefix)
4. Upserts `stores` + `product_offers` on DropZone Supabase `xvfxjxmdtazihzuyyrsj`
5. Response includes `lowes: { connected, mode, message, envMissing }`

Check status without secrets:

`GET https://dropzone-seven-ecru.vercel.app/api/inventory/lowes/status`

UI: home **Connect Lowe's** chip (olive/orange pill next to Connect HD).

## Fallback

Without credentials, DropZone keeps curated Lowe's starter SKUs and labels the chip **not connected** so you know to paste Impact/partner keys.

## SQL

No Lowe's-specific SQL — uses existing `stores` + `product_offers` (init / inventory schema).

## Isolation

DropZone only. No player1. No secrets in git.
