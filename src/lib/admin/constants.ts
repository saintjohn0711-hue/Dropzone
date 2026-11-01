/** Documented demo admin when ADMIN_EMAIL / ADMIN_PASSWORD_HASH are unset. */
export const DEMO_ADMIN = {
  email: "admin@dropzone.test",
  /** Demo only — clearly labeled in UI. Set real hash on Vercel for production control. */
  password: "DropZone-Admin-Demo!",
  displayName: "Demo Admin",
  label: "TEST ADMIN (env secrets not set)",
} as const;

export const ADMIN_SESSION_COOKIE = "dz_admin_session";
export const ADMIN_SESSION_STORAGE = "dz-admin-session";
export const ADMIN_SESSION_DAYS = 7;

export type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "pending",
  "approved",
  "rejected",
  "suspended",
];

/** DB + UI order statuses (aliases normalized on write). */
export type OrderStatus =
  | "draft"
  | "pending"
  | "placed"
  | "dispatched"
  | "assigned"
  | "en_route"
  | "delivered"
  | "cancelled"
  | "canceled";

export const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "assigned",
  "en_route",
  "delivered",
  "canceled",
];

export function normalizeOrderStatus(status: string): OrderStatus {
  const s = status.toLowerCase();
  if (s === "pending" || s === "placed") return "placed";
  if (s === "dispatched" || s === "assigned") return "assigned";
  if (s === "en_route") return "en_route";
  if (s === "delivered") return "delivered";
  if (s === "cancelled" || s === "canceled") return "canceled";
  if (s === "draft") return "placed";
  return "placed";
}

export function orderStatusForDb(status: string): string {
  const n = normalizeOrderStatus(status);
  // Prefer canonical names that match extended constraint
  if (n === "placed") return "placed";
  if (n === "assigned") return "assigned";
  if (n === "canceled") return "canceled";
  return n;
}
