# DropZone Admin backend

Desktop-friendly control plane for drivers, orders, and inventory.

**URL:** https://dropzone-seven-ecru.vercel.app/admin  
**Login:** https://dropzone-seven-ecru.vercel.app/admin/login

Isolated DropZone only — Supabase `xvfxjxmdtazihzuyyrsj`, Vercel project **dropzone**. Never player1.

## Test / demo login (when env secrets unset)

| Field | Value |
|-------|--------|
| Email | `admin@dropzone.test` |
| Password | `DropZone-Admin-Demo!` |

UI shows a **TEST ADMIN** banner. Replace with real secrets for production control.

## Env keys (Vercel **dropzone** only)

| Key | Required | Purpose |
|-----|----------|---------|
| `ADMIN_EMAIL` | For prod | Admin login email |
| `ADMIN_PASSWORD_HASH` | For prod | scrypt hash (`scrypt$N$r$p$salt$hash`) |
| `ADMIN_SESSION_SECRET` | Recommended | HMAC secret for soft sessions if `admin_sessions` table missing |
| `ADMIN_ALLOWLIST` | Optional | Comma-separated extra emails sharing the same password hash |
| `ADMIN_DISPLAY_NAME` | Optional | Display name for primary admin |

Generate a hash locally (do **not** commit the password):

```bash
node -e 'const {scryptSync,randomBytes}=require("crypto");const p=process.argv[1];const N=16384,r=8,p1=1;const s=randomBytes(16);const h=scryptSync(p,s,32,{N,r,p:p1});console.log(`scrypt$${N}$${r}$${p1}$${s.toString("hex")}$${h.toString("hex")}`)' 'YOUR_PASSWORD'
```

Or from the repo after deploy: use the same `hashPassword` helper in `src/lib/admin/password.ts`.

Also requires existing DropZone keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## SQL to run

Paste in https://supabase.com/dashboard/project/xvfxjxmdtazihzuyyrsj/sql/new :

1. `/cursor/stores/self/docs/supabase-admin.sql` (this feature)
2. Preferably also `supabase-driver-application.sql` so admin can see full applications

Until SQL is applied, admin still works with soft sessions + core driver/order columns.

## Features

- **Auth:** cookie + Bearer opaque token; logout clears both
- **Drivers:** search/filter by active, application status, vehicle; detail with approve/reject/suspend/activate; notes
- **Orders:** list + status updates (placed → assigned → en_route → delivered / canceled)
- **Control:** inventory refresh + Home Depot connection status; stats cards

## Routes

| Path | Role |
|------|------|
| `/admin/login` | Login |
| `/admin` | Overview / stats / inventory |
| `/admin/drivers` | Driver list |
| `/admin/drivers/[id]` | Driver application detail |
| `/admin/orders` | Orders |

APIs under `/api/admin/*` require admin session.
