import type { Driver, DriverSignupInput, DriverStatus } from "@/lib/drivers";

const LOCAL_DRIVERS_KEY = "dz-drivers-local";

function readAll(): Driver[] {
  try {
    const raw = localStorage.getItem(LOCAL_DRIVERS_KEY);
    return raw ? (JSON.parse(raw) as Driver[]) : [];
  } catch {
    return [];
  }
}

function writeAll(drivers: Driver[]) {
  localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(drivers));
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function localCreateDriver(input: DriverSignupInput): Driver {
  const drivers = readAll();
  const email = input.email.trim().toLowerCase();
  if (drivers.some((d) => d.email === email)) {
    throw new Error("A driver with this email already exists");
  }
  const now = new Date().toISOString();
  const driver: Driver = {
    id: uuid(),
    name: input.name.trim(),
    email,
    phone: input.phone?.trim() || null,
    vehicle_type: input.vehicle_type,
    vehicle_detail: input.vehicle_detail?.trim() || null,
    license_plate: input.license_plate?.trim() || null,
    status: "inactive",
    locale: input.locale === "es" ? "es" : "en",
    created_at: now,
    updated_at: now,
  };
  drivers.unshift(driver);
  writeAll(drivers);
  return driver;
}

export function localGetDriver(id: string): Driver | null {
  return readAll().find((d) => d.id === id) ?? null;
}

export function localGetByEmail(email: string): Driver | null {
  const needle = email.trim().toLowerCase();
  return readAll().find((d) => d.email === needle) ?? null;
}

export function localSetStatus(id: string, status: DriverStatus): Driver | null {
  const drivers = readAll();
  const idx = drivers.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  drivers[idx] = {
    ...drivers[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  writeAll(drivers);
  return drivers[idx];
}
