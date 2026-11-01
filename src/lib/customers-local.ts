/** Soft local customer store when supabase-customers.sql not applied. */

export type LocalJobsite = {
  id: string;
  label: string;
  address: string;
  created_at: string;
};

export type LocalCustomer = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  jobsites: LocalJobsite[];
  orderIds: string[];
};

const KEY = "dz-customers-local";

function readAll(): Record<string, LocalCustomer> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, LocalCustomer>) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, LocalCustomer>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function localUpsertCustomer(input: {
  email: string;
  name?: string | null;
}): LocalCustomer {
  const email = input.email.trim().toLowerCase();
  const all = readAll();
  const existing = Object.values(all).find((c) => c.email === email);
  if (existing) {
    if (input.name && !existing.name) {
      existing.name = input.name;
      all[existing.id] = existing;
      writeAll(all);
    }
    return existing;
  }
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `local-cust-${Date.now()}`;
  const row: LocalCustomer = {
    id,
    email,
    name: input.name?.trim() || null,
    created_at: new Date().toISOString(),
    jobsites: [],
    orderIds: [],
  };
  all[id] = row;
  writeAll(all);
  return row;
}

export function localGetCustomer(id: string): LocalCustomer | null {
  return readAll()[id] || null;
}

export function localGetByEmail(email: string): LocalCustomer | null {
  const needle = email.trim().toLowerCase();
  return Object.values(readAll()).find((c) => c.email === needle) || null;
}

export function localAddJobsite(
  customerId: string,
  label: string,
  address: string,
): LocalJobsite | null {
  const all = readAll();
  const c = all[customerId];
  if (!c) return null;
  const site: LocalJobsite = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `js-${Date.now()}`,
    label: label.trim() || "Jobsite",
    address: address.trim(),
    created_at: new Date().toISOString(),
  };
  c.jobsites = [site, ...c.jobsites];
  all[customerId] = c;
  writeAll(all);
  return site;
}

export function localRemoveJobsite(customerId: string, jobsiteId: string) {
  const all = readAll();
  const c = all[customerId];
  if (!c) return;
  c.jobsites = c.jobsites.filter((j) => j.id !== jobsiteId);
  all[customerId] = c;
  writeAll(all);
}

export function localRememberOrder(customerId: string, orderId: string) {
  const all = readAll();
  const c = all[customerId];
  if (!c) return;
  if (!c.orderIds.includes(orderId)) {
    c.orderIds = [orderId, ...c.orderIds].slice(0, 50);
    all[customerId] = c;
    writeAll(all);
  }
}

export const DEMO_CUSTOMER = {
  email: "customer@dropzone.test",
  name: "Demo Customer",
  note: "Email-only demo login (no password). Soft local if SQL not pasted.",
} as const;
