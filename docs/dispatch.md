# DropZone dispatch

Admin assigns open orders to **active** drivers. Drivers accept / start / complete from the dashboard.

**Admin orders:** https://dropzone-seven-ecru.vercel.app/admin/orders  
**Driver dashboard:** https://dropzone-seven-ecru.vercel.app/driver/dashboard  

## Flow

1. Driver goes **Active** on `/driver/dashboard`.  
2. Admin opens **Orders**, picks an active driver, clicks **Assign** (`POST /api/admin/dispatch`).  
3. Order status → `assigned` (or legacy `dispatched`).  
4. Driver sees job under **Assigned jobs** (`GET /api/drivers/jobs`).  
5. Driver actions: **Accept** → **Start en route** → **Complete delivery**.

## SQL

Paste `/cursor/stores/self/docs/supabase-dispatch.sql` (and preferably `supabase-admin.sql` for status aliases) on Supabase `xvfxjxmdtazihzuyyrsj`.

Adds: `assigned_driver_id`, `assigned_at`, `driver_accepted_at`, `driver_started_at`, `driver_completed_at`, `dispatch_notes`.

Until SQL runs: APIs soft-fallback (status-only updates + on-screen hints).

## Notes

- Only `status=active` drivers appear in the assign dropdown.  
- Driver job APIs require driver session Bearer / cookie (same as dashboard login).  
- No player1 bleed.
