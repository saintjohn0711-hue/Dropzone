# Proof of delivery

Driver completes a job with an optional delivery photo + timestamp. Customer tracking shows POD when present.

## Flow

1. Driver dashboard → job → **Complete** opens POD capture (camera/file).
2. `PATCH /api/drivers/jobs` with `action: "complete"` + optional `podPhotoDataUrl`.
3. Upload to private Supabase bucket `proof-of-delivery` (path `orders/<id>/<ts>.jpg`).
4. Order columns: `pod_path`, `pod_captured_at`, `pod_status` (`stored` \| `deferred`), `pod_note`.
5. Tracking `GET /api/orders/[id]/track` returns signed URL thumbnail when stored.

## Soft fallback

If bucket/SQL missing: still marks **delivered**; POD status `deferred` + note to run SQL. No images written to git.

## SQL (paste later)

`/cursor/stores/self/docs/supabase-pod.sql`  
Repo: `supabase/migrations/20261101211000_pod.sql`

## Env

Uses DropZone `SUPABASE_SERVICE_ROLE_KEY` for private upload + signed URLs. No new public keys.

## Screens

- Driver: `media/driver-pod.png`
- Customer tracking: `media/tracking-pod.png`

## Isolation

DropZone only. Private bucket. No player1. No secrets in git.
