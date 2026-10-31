export type DriverStatus = "active" | "inactive";
export type VehicleType = "car" | "pickup" | "box_truck" | "drone";
export type DriverRankTier = "bronze" | "silver" | "gold" | "elite";

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
  drives_completed?: number;
  rating_avg?: number | null;
  rank_score?: number;
  rank_tier?: DriverRankTier;
  rank_position?: number | null;
  rank_area?: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverSignupInput = {
  name: string;
  email: string;
  phone?: string;
  vehicle_type: VehicleType;
  vehicle_detail?: string;
  license_plate?: string;
  locale?: string;
};

export const DRIVER_STORAGE_KEY = "dz-driver-id";
