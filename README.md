# DropZone

**What you need. Where you need it.**

Jobsite delivery product shell — olive brand, Next.js App Router, dedicated Supabase + Vercel stack. Fully isolated from player1.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — **new** project named DropZone only
- Inventory: `StoreInventorySource` (seed + box-store scrubber skeleton)

## Screens

| Route | Purpose |
|-------|---------|
| `/` | Browse / filter products |
| `/product/[id]` | Detail — vehicle by weight + rush |
| `/cart` | Cart |
| `/pricing` | Pricing guide |
| `/tracking` | Tracking stub |
| `/chat` | Driver chat stub |

## Local setup

```bash
cp .env.example .env.local
# Fill with NEW DropZone Supabase keys only — never player1 keys
npm install
npm run dev
```

See [docs/SUPABASE.md](docs/SUPABASE.md) for project creation and migrations.

## Inventory scrub (dry-run without keys)

```bash
curl -X POST http://localhost:3000/api/inventory/scrub \
  -H 'content-type: application/json' \
  -d '{"source":"seed","dryRun":true}'
```

## Isolation

| Resource | This project |
|----------|----------------|
| GitHub | `saintjohn0711-hue/dropzone` |
| Vercel | `dropzone` / `prj_ePkeiDXdS9gsdYETP9ZkFuNUQeEK` |
| Supabase | New “DropZone” project only |
