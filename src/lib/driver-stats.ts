import type { Driver, DriverRankTier, DriverReview } from "@/lib/drivers";

export function tierFromScore(score: number): DriverRankTier {
  if (score >= 90) return "elite";
  if (score >= 75) return "gold";
  if (score >= 55) return "silver";
  return "bronze";
}

/** Deterministic-ish seed from driver id so the same driver keeps stable demo stats. */
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export type SeededDriverStats = {
  drives_completed: number;
  rating_avg: number;
  rank_score: number;
  rank_tier: DriverRankTier;
  rank_position: number;
  rank_area: string;
  reviews: Omit<DriverReview, "id" | "driver_id" | "created_at">[];
};

const AREAS = [
  "Brooklyn jobsites",
  "Queens metro",
  "North Jersey drops",
  "Long Island corridor",
  "Manhattan sites",
];

const REVIEW_BANK: Array<{
  rating: number;
  quote: string;
  customer_first_name: string;
}> = [
  {
    rating: 5,
    quote: "Lumber on site before the pour started. Absolute pro.",
    customer_first_name: "Mike",
  },
  {
    rating: 5,
    quote: "Careful with the drywall and texted the gate code. Five stars.",
    customer_first_name: "Sara",
  },
  {
    rating: 4.5,
    quote: "Beat the rush ETA with cement bags — saved our morning.",
    customer_first_name: "Chris",
  },
  {
    rating: 5,
    quote: "Friendly, on time, and helped unload the 2x4s.",
    customer_first_name: "Priya",
  },
  {
    rating: 4.5,
    quote: "Clean drop at a tight alley. Will request again.",
    customer_first_name: "Jordan",
  },
];

export function buildSeededStats(driverId: string, name?: string): SeededDriverStats {
  const h = hashSeed(driverId || name || "dropzone");
  const drives = 40 + (h % 180);
  const rank_score = 62 + (h % 37); // 62–98
  const rank_tier = tierFromScore(rank_score);
  const rank_position = 1 + (h % 24);
  const rank_area = AREAS[h % AREAS.length];
  const rating_avg = Math.round((4.4 + ((h % 6) / 10)) * 10) / 10; // 4.4–4.9

  const start = h % REVIEW_BANK.length;
  const reviews = [0, 1, 2].map((i) => REVIEW_BANK[(start + i) % REVIEW_BANK.length]);

  return {
    drives_completed: drives,
    rating_avg,
    rank_score,
    rank_tier,
    rank_position,
    rank_area,
    reviews,
  };
}

export function driverNeedsStatsSeed(driver: Partial<Driver>): boolean {
  const drives = driver.drives_completed ?? 0;
  const score = driver.rank_score ?? 0;
  return drives === 0 && score === 0;
}

export function applySeedToDriver(
  driver: Driver,
  seed: SeededDriverStats,
): Driver {
  return {
    ...driver,
    drives_completed: seed.drives_completed,
    rating_avg: seed.rating_avg,
    rank_score: seed.rank_score,
    rank_tier: seed.rank_tier,
    rank_position: seed.rank_position,
    rank_area: seed.rank_area,
  };
}

export function seedReviewsLocal(
  driverId: string,
  seed: SeededDriverStats,
): DriverReview[] {
  const now = new Date().toISOString();
  return seed.reviews.map((r, i) => ({
    id: `local-review-${driverId}-${i}`,
    driver_id: driverId,
    rating: r.rating,
    quote: r.quote,
    customer_first_name: r.customer_first_name,
    created_at: now,
  }));
}
