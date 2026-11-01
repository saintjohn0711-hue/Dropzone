import type {
  Driver,
  DriverReview,
  DriverSignupInput,
  DriverStatus,
  VehicleType,
  WeightClass,
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

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return undefined;
}

export function localCreateDriver(input: DriverSignupInput): Driver {
  const drivers = readAll();
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  if (!email) throw new Error("email is required");
  if (drivers.some((d) => d.email === email)) {
    throw new Error("A driver with this email already exists");
  }
  const now = new Date().toISOString();
  const id = uuid();
  const legal =
    str(input.legal_name) || str(input.name) || "Driver";
  const seed = buildSeededStats(id, legal);
  const days = Array.isArray(input.availability_days)
    ? (input.availability_days as string[]).join(",")
    : str(input.availability_days);

  const base: Driver = {
    id,
    name: legal,
    email,
    phone: str(input.phone) || null,
    vehicle_type: (input.vehicle_type || "pickup") as VehicleType,
    vehicle_detail:
      str(input.vehicle_detail) ||
      [input.vehicle_year, input.vehicle_make, input.vehicle_model, input.vehicle_color]
        .map(str)
        .filter(Boolean)
        .join(" ") || null,
    license_plate:
      str(input.license_plate) ||
      [str(input.license_plate_state), str(input.license_plate)]
        .filter(Boolean)
        .join(" ") || null,
    status: "inactive",
    locale: input.locale === "es" ? "es" : "en",
    display_name: str(input.display_name) || null,
    date_of_birth: str(input.date_of_birth) || null,
    address_street: str(input.address_street) || null,
    address_city: str(input.address_city) || null,
    address_state: str(input.address_state) || null,
    address_zip: str(input.address_zip) || null,
    dl_number: str(input.dl_number) || null,
    dl_state: str(input.dl_state) || null,
    dl_expiration: str(input.dl_expiration) || null,
    dl_front_path: null,
    dl_back_path: null,
    dl_upload_status: "deferred",
    vehicle_make: str(input.vehicle_make) || null,
    vehicle_model: str(input.vehicle_model) || null,
    vehicle_year: input.vehicle_year ? Number(input.vehicle_year) : null,
    vehicle_color: str(input.vehicle_color) || null,
    license_plate_state: str(input.license_plate_state) || null,
    hauling_notes: str(input.hauling_notes) || null,
    service_area: str(input.service_area) || null,
    availability_days: days || null,
    availability_hours: str(input.availability_hours) || null,
    can_haul_heavy: Boolean(input.can_haul_heavy),
    weight_class: (str(input.weight_class) as WeightClass) || null,
    insurance_confirmed: Boolean(input.insurance_confirmed),
    background_check_consent: Boolean(input.background_check_consent),
    terms_accepted: Boolean(input.terms_accepted),
    contractor_ack: Boolean(input.contractor_ack),
    signature_name: str(input.signature_name) || null,
    signed_at: str(input.signed_at) || now,
    application_json: input as unknown as Record<string, unknown>,
    application_completed_at: now,
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
