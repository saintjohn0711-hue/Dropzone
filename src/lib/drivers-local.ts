import type {
  Driver,
  DriverReview,
  DriverSignupInput,
  DriverStatus,
} from "@/lib/drivers";
import {
  applySeedToDriver,
  buildSeededStats,
  driverNeedsStatsSeed,
  seedReviewsLocal,
} from "@/lib/driver-stats";

const LOCAL_DRIVERS_KEY = "dz-drivers-local";
const LOCAL_REVIEWS_KEY = "dz-driver-reviews-local";

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

function readReviews(): DriverReview[] {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    return raw ? (JSON.parse(raw) as DriverReview[]) : [];
  } catch {
    return [];
  }
}

function writeReviews(reviews: DriverReview[]) {
  localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(reviews));
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureLocalProfile(driver: Driver): {
  driver: Driver;
  reviews: DriverReview[];
} {
  let next = driver;
  let reviews = readReviews()
    .filter((r) => r.driver_id === driver.id)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  if (driverNeedsStatsSeed(next) || reviews.length === 0) {
    const seed = buildSeededStats(next.id, next.name);
    if (driverNeedsStatsSeed(next)) {
      next = applySeedToDriver(next, seed);
      const all = readAll();
      const idx = all.findIndex((d) => d.id === next.id);
      if (idx >= 0) {
        all[idx] = next;
        writeAll(all);
      }
    }
    if (reviews.length === 0) {
      reviews = seedReviewsLocal(next.id, seed);
      const others = readReviews().filter((r) => r.driver_id !== next.id);
      writeReviews([...reviews, ...others]);
    }
  }
  return { driver: next, reviews };
}

export function localCreateDriver(input: DriverSignupInput): Driver {
  const drivers = readAll();
  const email = input.email.trim().toLowerCase();
  if (drivers.some((d) => d.email === email)) {
    throw new Error("A driver with this email already exists");
  }
  const now = new Date().toISOString();
  const id = uuid();
  const seed = buildSeededStats(id, input.name.trim());
  const base: Driver = {
    id,
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
  const driver = applySeedToDriver(base, seed);
  drivers.unshift(driver);
  writeAll(drivers);
  const reviews = seedReviewsLocal(id, seed);
  writeReviews([...reviews, ...readReviews()]);
  return driver;
}

export function localGetDriver(id: string): Driver | null {
  const found = readAll().find((d) => d.id === id);
  if (!found) return null;
  return ensureLocalProfile(found).driver;
}

export function localGetDriverProfile(id: string): {
  driver: Driver;
  reviews: DriverReview[];
} | null {
  const found = readAll().find((d) => d.id === id);
  if (!found) return null;
  return ensureLocalProfile(found);
}

export function localGetByEmail(email: string): Driver | null {
  const needle = email.trim().toLowerCase();
  const found = readAll().find((d) => d.email === needle);
  if (!found) return null;
  return ensureLocalProfile(found).driver;
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
  return ensureLocalProfile(drivers[idx]).driver;
}
