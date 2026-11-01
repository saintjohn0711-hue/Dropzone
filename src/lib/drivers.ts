export type DriverStatus = "active" | "inactive";
export type VehicleType =
  | "car"
  | "suv"
  | "pickup"
  | "van"
  | "box_truck"
  | "drone";
export type DriverRankTier = "bronze" | "silver" | "gold" | "elite";
export type WeightClass = "light" | "medium" | "heavy";
export type DlUploadStatus = "stored" | "deferred" | "none";

export type DriverReview = {
  id: string;
  driver_id: string;
  rating: number;
  quote: string;
  customer_first_name: string;
  created_at: string;
};

export type Driver = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  vehicle_type: VehicleType;
  vehicle_detail: string | null;
  license_plate: string | null;
  status: DriverStatus;
  locale: string;
  display_name?: string | null;
  date_of_birth?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  dl_number?: string | null;
  dl_state?: string | null;
  dl_expiration?: string | null;
  dl_front_path?: string | null;
  dl_back_path?: string | null;
  dl_upload_status?: DlUploadStatus | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  vehicle_color?: string | null;
  license_plate_state?: string | null;
  hauling_notes?: string | null;
  service_area?: string | null;
  availability_days?: string | null;
  availability_hours?: string | null;
  can_haul_heavy?: boolean | null;
  weight_class?: WeightClass | null;
  insurance_confirmed?: boolean | null;
  background_check_consent?: boolean | null;
  terms_accepted?: boolean | null;
  contractor_ack?: boolean | null;
  signature_name?: string | null;
  signed_at?: string | null;
  application_json?: Record<string, unknown> | null;
  application_completed_at?: string | null;
  drives_completed?: number;
  rating_avg?: number | null;
  rank_score?: number;
  rank_tier?: DriverRankTier;
  rank_position?: number | null;
  rank_area?: string | null;
  created_at: string;
  updated_at: string;
};

/** @deprecated Prefer DriverApplicationInput from driver-application.ts */
export type DriverSignupInput = {
  name?: string;
  legal_name?: string;
  display_name?: string;
  email: string;
  phone?: string;
  vehicle_type: VehicleType;
  vehicle_detail?: string;
  license_plate?: string;
  locale?: string;
  [key: string]: unknown;
};

export const DRIVER_STORAGE_KEY = "dz-driver-id";
