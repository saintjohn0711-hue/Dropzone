import type { Driver, DriverReview } from "@/lib/drivers";
import {
  applySeedToDriver,
  buildSeededStats,
  driverNeedsStatsSeed,
  seedReviewsLocal,
} from "@/lib/driver-stats";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DriverProfilePayload = {
  driver: Driver;
  reviews: DriverReview[];
  seeded: boolean;
  statsPersisted: boolean;
  reviewsPersisted: boolean;
  hint?: string;
};

async function fetchReviews(
  client: SupabaseClient,
  driverId: string,
): Promise<{ reviews: DriverReview[]; missing: boolean; error?: string }> {
  const { data, error } = await client
    .from("driver_reviews")
    .select("id, driver_id, rating, quote, customer_first_name, created_at")
    .eq("driver_id", driverId)
    .order("rating", { ascending: false })
    .limit(3);

  if (error) {
    if (isMissingRelation(error)) {
      return { reviews: [], missing: true, error: error.message };
    }
    return { reviews: [], missing: false, error: error.message };
  }
  return { reviews: (data ?? []) as DriverReview[], missing: false };
}

async function persistStats(
  client: SupabaseClient,
  driver: Driver,
  seed: ReturnType<typeof buildSeededStats>,
): Promise<{ driver: Driver; ok: boolean; missing: boolean }> {
  const patch = {
    drives_completed: seed.drives_completed,
    rating_avg: seed.rating_avg,
    rank_score: seed.rank_score,
    rank_tier: seed.rank_tier,
    rank_position: seed.rank_position,
    rank_area: seed.rank_area,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("drivers")
    .update(patch)
    .eq("id", driver.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return {
      driver: applySeedToDriver(driver, seed),
      ok: false,
      missing: isMissingRelation(error) || error.message.includes("rank_"),
    };
  }
  return { driver: (data as Driver) ?? applySeedToDriver(driver, seed), ok: true, missing: false };
}

async function persistReviews(
  client: SupabaseClient,
  driverId: string,
  seed: ReturnType<typeof buildSeededStats>,
): Promise<{ reviews: DriverReview[]; ok: boolean; missing: boolean }> {
  const rows = seed.reviews.map((r) => ({
    driver_id: driverId,
    rating: r.rating,
    quote: r.quote,
    customer_first_name: r.customer_first_name,
  }));
  const { data, error } = await client
    .from("driver_reviews")
    .insert(rows)
    .select("id, driver_id, rating, quote, customer_first_name, created_at");

  if (error) {
    return {
      reviews: seedReviewsLocal(driverId, seed),
      ok: false,
      missing: isMissingRelation(error),
    };
  }
  return {
    reviews: ((data ?? []) as DriverReview[]).sort((a, b) => b.rating - a.rating).slice(0, 3),
    ok: true,
    missing: false,
  };
}

/**
 * Load driver profile + top reviews. When stats/reviews empty, seed realistic
 * values and upsert when schema allows.
 */
export async function loadDriverProfile(
  driverId: string,
  options: { forceSeed?: boolean } = {},
): Promise<DriverProfilePayload | { error: string; status: number; hint?: string }> {
  const client = getWriteClient();
  if (!client) {
    return {
      error: "Supabase not configured",
      status: 503,
      hint: "Set NEXT_PUBLIC_SUPABASE_URL + keys for DropZone project.",
    };
  }

  const { data, error } = await client
    .from("drivers")
    .select("*")
    .eq("id", driverId)
    .maybeSingle();

  if (error) {
    const missing = isMissingRelation(error);
    return {
      error: error.message,
      status: missing ? 503 : 400,
      hint: missing
        ? "Run supabase-drivers.sql in DropZone SQL editor first."
        : undefined,
    };
  }
  if (!data) {
    return { error: "Driver not found", status: 404 };
  }

  let driver = data as Driver;
  let seeded = false;
  let statsPersisted = false;
  let reviewsPersisted = false;
  let hint: string | undefined;

  const reviewFetch = await fetchReviews(client, driverId);
  let reviews = reviewFetch.reviews;

  const needsSeed =
    options.forceSeed ||
    driverNeedsStatsSeed(driver) ||
    reviews.length === 0;

  if (needsSeed) {
    const seed = buildSeededStats(driver.id, driver.name);
    seeded = true;

    if (driverNeedsStatsSeed(driver) || options.forceSeed) {
      const persisted = await persistStats(client, driver, seed);
      driver = persisted.driver;
      statsPersisted = persisted.ok;
      if (!persisted.ok) {
        hint =
          "Run /cursor/stores/self/docs/supabase-driver-stats.sql (or migrations/20261031140000_driver_stats.sql) in the DropZone SQL editor to persist rank/drives.";
      }
    } else {
      // keep DB stats; only fill reviews
      driver = {
        ...driver,
        rank_tier: driver.rank_tier ?? seed.rank_tier,
        rank_area: driver.rank_area ?? seed.rank_area,
      };
    }

    if (reviews.length === 0 || options.forceSeed) {
      if (options.forceSeed && reviews.length > 0 && !reviewFetch.missing) {
        await client.from("driver_reviews").delete().eq("driver_id", driverId);
      }
      const saved = await persistReviews(client, driverId, seed);
      reviews = saved.reviews;
      reviewsPersisted = saved.ok;
      if (!saved.ok) {
        hint =
          hint ??
          "Run supabase-driver-stats.sql to create driver_reviews, then POST /api/drivers/:id/seed-stats.";
      }
    }
  }

  // Normalize defaults for UI if columns missing from older rows
  if (!driver.rank_tier || driver.drives_completed == null) {
    const seed = buildSeededStats(driver.id, driver.name);
    driver = applySeedToDriver(driver, {
      ...seed,
      drives_completed: driver.drives_completed || seed.drives_completed,
      rating_avg: driver.rating_avg ?? seed.rating_avg,
      rank_score: driver.rank_score || seed.rank_score,
      rank_tier: driver.rank_tier || seed.rank_tier,
      rank_position: driver.rank_position || seed.rank_position,
      rank_area: driver.rank_area || seed.rank_area,
    });
    if (reviews.length === 0) reviews = seedReviewsLocal(driver.id, seed);
    seeded = true;
  }

  reviews = [...reviews].sort((a, b) => b.rating - a.rating).slice(0, 3);

  return {
    driver,
    reviews,
    seeded,
    statsPersisted,
    reviewsPersisted,
    hint,
  };
}
