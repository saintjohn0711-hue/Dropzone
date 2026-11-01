# Customer accounts

Lightweight email-only customer sessions (same pattern as drivers): save jobsites, order history, reorder into cart. EN/ES. Soft local fallback until SQL is pasted.

## URLs

| Surface | Path |
|---------|------|
| Login | https://dropzone-seven-ecru.vercel.app/account/login |
| Account / jobsites | `/account` |
| Order history | `/account/orders` |
| Demo email | `customer@dropzone.test` |

## Behavior

1. **Sign in** with email (+ optional name) → opaque session token (SHA-256 in `customer_sessions`) or soft `local-<id>` when SQL missing.
2. **Jobsites** — label + address; “Use at checkout” prefills delivery address.
3. **Order history** — orders linked by `customer_id` or `contact_email`; Track + Reorder.
4. **Reorder** — loads `cart_items` into `dz-cart` localStorage → `/cart`.
5. Checkout sends `customerId` when logged in.

## SQL (paste later)

`/cursor/stores/self/docs/supabase-customers.sql`  
Repo: `supabase/migrations/20261101210000_customers.sql`

Creates `customers`, `customer_sessions`, `customer_jobsites`, and `orders.customer_id` / `contact_email`.

## Soft fallbacks

Without SQL: browser `dz-customers-local` store for account + jobsites; order list may be empty until orders are linked. No secrets in git.

## Env

No new env keys. Uses existing DropZone Supabase URL + service role.

## Isolation

DropZone only (`xvfxjxmdtazihzuyyrsj` / `prj_ePkeiDXdS9gsdYETP9ZkFuNUQeEK`). No player1.
