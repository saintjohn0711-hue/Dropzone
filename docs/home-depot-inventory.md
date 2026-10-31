# Home Depot inventory (ToS-safe)

DropZone does **not** scrape homedepot.com or bypass bot protection.

## Official path (recommended)

**The Home Depot Affiliate Program** (Impact.com) provides a **daily product data feed** to accepted affiliates — this is the retailer-sanctioned catalog.

1. Read FAQs: https://www.homedepot.com/c/SF_MS_Affiliate_Program_FAQs  
2. Apply via Impact for The Home Depot Affiliate Program.  
3. Once accepted, in Impact: **Manage → More → My Products** → Home Depot catalog.  
4. Download the catalog (CSV/XML) or copy the **direct download / API access** URL.  
5. Prefer Impact Format CSV with fields like `Sku`, `Name`, `Current Price`, `Stock Availability`, `Image Url`, `Category Name`.

### Env vars (Vercel project **dropzone** only — never player1)

| Key | Required | Purpose |
|-----|----------|---------|
| `HOME_DEPOT_IMPACT_FEED_URL` | Yes for live HD | HTTPS URL to Impact catalog download or mirrored JSON/CSV |
| `HOME_DEPOT_IMPACT_USERNAME` | Optional | Basic auth user if feed is protected |
| `HOME_DEPOT_IMPACT_PASSWORD` | Optional | Basic auth password |
| `HOME_DEPOT_IMPACT_TOKEN` | Optional | Bearer token if Impact API access uses a token |

Add under Vercel → Project **dropzone** (`prj_ePkeiDXdS9gsdYETP9ZkFuNUQeEK`) → Settings → Environment Variables → Production (+ Preview). Redeploy after saving.

## Alternate: partner REST JSON

If you have a **licensed** partner/aggregator that returns JSON `{ items: [{ sku, name, price, stock_signal, category }] }`:

| Key | Required |
|-----|----------|
| `HOME_DEPOT_API_ENDPOINT` | Yes |
| `HOME_DEPOT_API_KEY` | Yes (Bearer) |
| `HOME_DEPOT_API_HEADER_NAME` / `HOME_DEPOT_API_HEADER_VALUE` | Optional extra header |

Or reuse the generic proxy:

| Key | Purpose |
|-----|---------|
| `INVENTORY_SCRUBBER_ENDPOINT` | GET `?store=home-depot` |
| `INVENTORY_SCRUBBER_API_KEY` | Bearer |

**Do not** use SerpApi / HTML scrapers against homedepot.com for this project.

## How Refresh works

1. Home **Refresh inventory** → `POST /api/inventory/refresh`  
2. Or `POST /api/inventory/scrub` with `{ "source": "home-depot", "dryRun": false }`  
3. Adapter picks Impact feed → partner REST → scrubber proxy → **starter SKUs**  
4. Upserts `stores` + `product_offers` (and best-effort `products`) on DropZone Supabase `xvfxjxmdtazihzuyyrsj`  
5. Response includes `homeDepot: { connected, mode, message, envMissing }`

Check status without secrets:

`GET https://dropzone-seven-ecru.vercel.app/api/inventory/home-depot/status`

## Fallback

Without credentials, DropZone keeps the curated HD starter catalog and labels scrub/UI as **not connected** so you know to paste Impact keys.
