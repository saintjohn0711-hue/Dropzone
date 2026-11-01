import type { VehicleType } from "@/lib/drivers";

export const APPLICATION_VEHICLES: VehicleType[] = [
  "car",
  "suv",
  "pickup",
  "van",
  "box_truck",
  "drone",
];

export const WEIGHT_CLASSES = ["light", "medium", "heavy"] as const;
export type WeightClass = (typeof WEIGHT_CLASSES)[number];

export const WEEKDAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
] as const;

/** Core columns that exist before the application migration. */
export const DRIVER_CORE_COLUMNS = [
  "name",
  "email",
  "phone",
  "vehicle_type",
  "vehicle_detail",
  "license_plate",
  "status",
  "locale",
] as const;

/** Extended discrete columns from supabase-driver-application.sql */
export const DRIVER_APPLICATION_COLUMNS = [
  "display_name",
  "date_of_birth",
  "address_street",
  "address_city",
  "address_state",
  "address_zip",
  "dl_number",
  "dl_state",
  "dl_expiration",
  "dl_front_path",
  "dl_back_path",
  "dl_upload_status",
  "vehicle_make",
  "vehicle_model",
  "vehicle_year",
  "vehicle_color",
  "license_plate_state",
  "hauling_notes",
  "service_area",
  "availability_days",
  "availability_hours",
  "can_haul_heavy",
  "weight_class",
  "insurance_confirmed",
  "background_check_consent",
  "terms_accepted",
  "contractor_ack",
  "signature_name",
  "signed_at",
  "application_json",
  "application_completed_at",
] as const;

export type DriverApplicationInput = {
  legal_name: string;
  display_name?: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  dl_number: string;
  dl_state: string;
  dl_expiration: string;
  vehicle_type: VehicleType;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string | number;
  vehicle_color: string;
  license_plate: string;
  license_plate_state: string;
  hauling_notes?: string;
  service_area: string;
  availability_days: string[] | string;
  availability_hours?: string;
  can_haul_heavy: boolean | string;
  weight_class?: WeightClass | string;
  insurance_confirmed: boolean | string;
  background_check_consent: boolean | string;
  terms_accepted: boolean | string;
  contractor_ack: boolean | string;
  signature_name: string;
  signed_at?: string;
  locale?: string;
  /** Legacy thin-signup aliases */
  name?: string;
  vehicle_detail?: string;
};

export type DriverApplicationRow = {
  name: string;
  email: string;
  phone: string | null;
  vehicle_type: VehicleType;
  vehicle_detail: string | null;
  license_plate: string | null;
  status: "inactive";
  locale: string;
  display_name: string | null;
  date_of_birth: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  dl_number: string | null;
  dl_state: string | null;
  dl_expiration: string | null;
  dl_front_path: string | null;
  dl_back_path: string | null;
  dl_upload_status: "stored" | "deferred" | "none" | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  license_plate_state: string | null;
  hauling_notes: string | null;
  service_area: string | null;
  availability_days: string | null;
  availability_hours: string | null;
  can_haul_heavy: boolean;
  weight_class: WeightClass | null;
  insurance_confirmed: boolean;
  background_check_consent: boolean;
  terms_accepted: boolean;
  contractor_ack: boolean;
  signature_name: string | null;
  signed_at: string | null;
  application_json: Record<string, unknown>;
  application_completed_at: string;
};

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "on";
  }
  return false;
}

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function parseDays(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((d) => clean(d).toLowerCase()).filter(Boolean);
  }
  const raw = clean(v);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((d) => clean(d).toLowerCase()).filter(Boolean);
    }
  } catch {
    /* comma-separated */
  }
  return raw
    .split(/[,\s]+/)
    .map((d) => d.toLowerCase())
    .filter(Boolean);
}

function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

function adultDob(dob: string): boolean {
  const d = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  const age =
    (now.getUTCFullYear() - d.getUTCFullYear()) -
    (now.getUTCMonth() < d.getUTCMonth() ||
    (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())
      ? 1
      : 0);
  return age >= 18 && age <= 100;
}

export function validateDriverApplication(
  input: Partial<DriverApplicationInput>,
): { ok: true; value: DriverApplicationInput } | { ok: false; error: string } {
  const legal_name = clean(input.legal_name || input.name);
  const email = clean(input.email).toLowerCase();
  const phone = clean(input.phone);
  const date_of_birth = clean(input.date_of_birth);
  const address_street = clean(input.address_street);
  const address_city = clean(input.address_city);
  const address_state = clean(input.address_state).toUpperCase();
  const address_zip = clean(input.address_zip);
  const dl_number = clean(input.dl_number);
  const dl_state = clean(input.dl_state).toUpperCase();
  const dl_expiration = clean(input.dl_expiration);
  const vehicle_type = input.vehicle_type as VehicleType;
  const vehicle_make = clean(input.vehicle_make);
  const vehicle_model = clean(input.vehicle_model);
  const vehicle_year = clean(input.vehicle_year);
  const vehicle_color = clean(input.vehicle_color);
  const license_plate = clean(input.license_plate);
  const license_plate_state = clean(input.license_plate_state).toUpperCase();
  const service_area = clean(input.service_area);
  const availability_days = parseDays(input.availability_days);
  const signature_name = clean(input.signature_name);
  const weight_class = clean(input.weight_class).toLowerCase();

  const missing: string[] = [];
  if (!legal_name) missing.push("legal_name");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) missing.push("email");
  if (!phone || phone.replace(/\D/g, "").length < 10) missing.push("phone");
  if (!date_of_birth || !isIsoDate(date_of_birth) || !adultDob(date_of_birth)) {
    missing.push("date_of_birth");
  }
  if (!address_street) missing.push("address_street");
  if (!address_city) missing.push("address_city");
  if (!address_state || address_state.length !== 2) missing.push("address_state");
  if (!address_zip || !/^\d{5}(-\d{4})?$/.test(address_zip)) missing.push("address_zip");
  if (!dl_number) missing.push("dl_number");
  if (!dl_state || dl_state.length !== 2) missing.push("dl_state");
  if (!dl_expiration || !isIsoDate(dl_expiration)) missing.push("dl_expiration");
  if (!vehicle_type || !APPLICATION_VEHICLES.includes(vehicle_type)) {
    missing.push("vehicle_type");
  }
  if (!vehicle_make) missing.push("vehicle_make");
  if (!vehicle_model) missing.push("vehicle_model");
  if (!vehicle_year || !/^\d{4}$/.test(vehicle_year)) missing.push("vehicle_year");
  if (!vehicle_color) missing.push("vehicle_color");
  if (!license_plate) missing.push("license_plate");
  if (!license_plate_state || license_plate_state.length !== 2) {
    missing.push("license_plate_state");
  }
  if (!service_area) missing.push("service_area");
  if (availability_days.length === 0) missing.push("availability_days");
  if (!asBool(input.insurance_confirmed)) missing.push("insurance_confirmed");
  if (!asBool(input.background_check_consent)) {
    missing.push("background_check_consent");
  }
  if (!asBool(input.terms_accepted)) missing.push("terms_accepted");
  if (!asBool(input.contractor_ack)) missing.push("contractor_ack");
  if (!signature_name) missing.push("signature_name");
  if (
    signature_name &&
    legal_name &&
    signature_name.toLowerCase() !== legal_name.toLowerCase()
  ) {
    return {
      ok: false,
      error:
        "signature_name must match legal_name (type your full legal name to sign).",
    };
  }

  if (missing.length) {
    return {
      ok: false,
      error: `Missing or invalid required fields: ${missing.join(", ")}`,
    };
  }

  const yearNum = Number(vehicle_year);
  const thisYear = new Date().getUTCFullYear();
  if (yearNum < 1980 || yearNum > thisYear + 1) {
    return { ok: false, error: "vehicle_year out of range" };
  }

  if (weight_class && !WEIGHT_CLASSES.includes(weight_class as WeightClass)) {
    return { ok: false, error: "weight_class must be light, medium, or heavy" };
  }

  return {
    ok: true,
    value: {
      legal_name,
      display_name: clean(input.display_name) || undefined,
      email,
      phone,
      date_of_birth,
      address_street,
      address_city,
      address_state,
      address_zip,
      dl_number,
      dl_state,
      dl_expiration,
      vehicle_type,
      vehicle_make,
      vehicle_model,
      vehicle_year: yearNum,
      vehicle_color,
      license_plate,
      license_plate_state,
      hauling_notes: clean(input.hauling_notes) || undefined,
      service_area,
      availability_days,
      availability_hours: clean(input.availability_hours) || undefined,
      can_haul_heavy: asBool(input.can_haul_heavy),
      weight_class: (weight_class ||
        (asBool(input.can_haul_heavy) ? "heavy" : "medium")) as WeightClass,
      insurance_confirmed: true,
      background_check_consent: true,
      terms_accepted: true,
      contractor_ack: true,
      signature_name,
      signed_at: clean(input.signed_at) || new Date().toISOString(),
      locale: input.locale === "es" ? "es" : "en",
    },
  };
}

export function buildVehicleDetail(input: DriverApplicationInput): string {
  if (input.vehicle_detail?.trim()) return input.vehicle_detail.trim();
  const parts = [
    input.vehicle_year,
    input.vehicle_make,
    input.vehicle_model,
    input.vehicle_color ? `(${input.vehicle_color})` : "",
  ]
    .map((p) => clean(p))
    .filter(Boolean);
  return parts.join(" ");
}

export function buildApplicationRow(
  input: DriverApplicationInput,
  extras?: {
    dl_front_path?: string | null;
    dl_back_path?: string | null;
    dl_upload_status?: "stored" | "deferred" | "none";
  },
): DriverApplicationRow {
  const now = new Date().toISOString();
  const days = Array.isArray(input.availability_days)
    ? input.availability_days
    : parseDays(input.availability_days);
  const detail = buildVehicleDetail(input);
  const snapshot = {
    ...input,
    availability_days: days,
    vehicle_detail: detail,
    dl_front_path: extras?.dl_front_path ?? null,
    dl_back_path: extras?.dl_back_path ?? null,
    dl_upload_status: extras?.dl_upload_status ?? "none",
  };

  return {
    name: input.legal_name,
    email: input.email,
    phone: input.phone,
    vehicle_type: input.vehicle_type,
    vehicle_detail: detail,
    license_plate: `${input.license_plate_state} ${input.license_plate}`.trim(),
    status: "inactive",
    locale: input.locale === "es" ? "es" : "en",
    display_name: input.display_name || null,
    date_of_birth: input.date_of_birth,
    address_street: input.address_street,
    address_city: input.address_city,
    address_state: input.address_state,
    address_zip: input.address_zip,
    dl_number: input.dl_number,
    dl_state: input.dl_state,
    dl_expiration: input.dl_expiration,
    dl_front_path: extras?.dl_front_path ?? null,
    dl_back_path: extras?.dl_back_path ?? null,
    dl_upload_status: extras?.dl_upload_status ?? "none",
    vehicle_make: input.vehicle_make,
    vehicle_model: input.vehicle_model,
    vehicle_year: Number(input.vehicle_year),
    vehicle_color: input.vehicle_color,
    license_plate_state: input.license_plate_state,
    hauling_notes: input.hauling_notes || null,
    service_area: input.service_area,
    availability_days: days.join(","),
    availability_hours: input.availability_hours || null,
    can_haul_heavy: asBool(input.can_haul_heavy),
    weight_class: (input.weight_class as WeightClass) || null,
    insurance_confirmed: true,
    background_check_consent: true,
    terms_accepted: true,
    contractor_ack: true,
    signature_name: input.signature_name,
    signed_at: input.signed_at || now,
    application_json: snapshot as unknown as Record<string, unknown>,
    application_completed_at: now,
  };
}

export function coreOnlyRow(row: DriverApplicationRow) {
  // Pre-migration check constraint only allows car|pickup|box_truck|drone
  const legacyType =
    row.vehicle_type === "suv" || row.vehicle_type === "van"
      ? "car"
      : row.vehicle_type;
  return {
    name: row.name,
    email: row.email,
    phone: row.phone,
    vehicle_type: legacyType,
    vehicle_detail: row.vehicle_detail,
    license_plate: row.license_plate,
    status: row.status,
    locale: row.locale,
  };
}

export function softFallbackRow(row: DriverApplicationRow) {
  return {
    ...coreOnlyRow(row),
    application_json: {
      ...row.application_json,
      vehicle_type_requested: row.vehicle_type,
    },
    application_completed_at: row.application_completed_at,
  };
}

function isMissingColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("column")
  );
}

type InsertClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

/** Insert full application; soft-fallback if migration columns missing. */
export async function insertDriverApplication(
  client: InsertClient,
  row: DriverApplicationRow,
): Promise<{
  data: Record<string, unknown> | null;
  error: string | null;
  mode: "full" | "soft" | "core";
  hint?: string;
}> {
  const full = await client.from("drivers").insert(row).select("*").single();
  if (!full.error) {
    return { data: full.data as Record<string, unknown>, error: null, mode: "full" };
  }

  if (full.error.code === "23505" || String(full.error.message).includes("duplicate")) {
    return { data: null, error: "A driver with this email already exists", mode: "full" };
  }

  if (!isMissingColumnError(String(full.error.message))) {
    return { data: null, error: String(full.error.message), mode: "full" };
  }

  const soft = await client
    .from("drivers")
    .insert(softFallbackRow(row))
    .select("*")
    .single();
  if (!soft.error) {
    return {
      data: soft.data as Record<string, unknown>,
      error: null,
      mode: "soft",
      hint: "Saved core + application_json. Run supabase-driver-application.sql for discrete columns + DL storage.",
    };
  }

  if (!isMissingColumnError(String(soft.error.message))) {
    return { data: null, error: String(soft.error.message), mode: "soft" };
  }

  const core = await client
    .from("drivers")
    .insert(coreOnlyRow(row))
    .select("*")
    .single();
  if (!core.error) {
    return {
      data: core.data as Record<string, unknown>,
      error: null,
      mode: "core",
      hint: "Saved core driver columns only. Run /cursor/stores/self/docs/supabase-driver-application.sql in DropZone Supabase to persist full application + license fields.",
    };
  }

  return {
    data: null,
    error: String(core.error.message),
    mode: "core",
    hint: "Run docs/supabase-drivers.sql then supabase-driver-application.sql in DropZone SQL editor.",
  };
}
