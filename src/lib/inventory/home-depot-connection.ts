/**
 * Home Depot connection modes (ToS-safe only — no HTML scrape).
 *
 * Preferred path: Home Depot Affiliate Program on Impact → daily product catalog feed.
 * Alternate: licensed partner/aggregator REST JSON with HOME_DEPOT_API_*.
 */

export type HomeDepotConnectionMode =
  | "impact_feed"
  | "partner_api"
  | "scrubber_proxy"
  | "starter";

export type HomeDepotConnectionStatus = {
  store: "home-depot";
  mode: HomeDepotConnectionMode;
  connected: boolean;
  label: string;
  message: string;
  envPresent: string[];
  envMissing: string[];
  docsPath: string;
};

export function getHomeDepotConnectionStatus(): HomeDepotConnectionStatus {
  const docsPath = "/cursor/stores/self/docs/home-depot-inventory.md";
  const impact = Boolean(process.env.HOME_DEPOT_IMPACT_FEED_URL?.trim());
  const partner =
    Boolean(process.env.HOME_DEPOT_API_ENDPOINT?.trim()) &&
    Boolean(process.env.HOME_DEPOT_API_KEY?.trim());
  const scrubber =
    Boolean(process.env.INVENTORY_SCRUBBER_ENDPOINT?.trim()) &&
    Boolean(process.env.INVENTORY_SCRUBBER_API_KEY?.trim());

  if (impact) {
    return {
      store: "home-depot",
      mode: "impact_feed",
      connected: true,
      label: "Home Depot Impact catalog feed",
      message:
        "Using HOME_DEPOT_IMPACT_FEED_URL (affiliate product feed — official HD path via Impact).",
      envPresent: ["HOME_DEPOT_IMPACT_FEED_URL"],
      envMissing: [],
      docsPath,
    };
  }

  if (partner) {
    return {
      store: "home-depot",
      mode: "partner_api",
      connected: true,
      label: "Home Depot partner REST API",
      message:
        "Using HOME_DEPOT_API_ENDPOINT + HOME_DEPOT_API_KEY (licensed/partner JSON).",
      envPresent: ["HOME_DEPOT_API_ENDPOINT", "HOME_DEPOT_API_KEY"],
      envMissing: [],
      docsPath,
    };
  }

  if (scrubber) {
    return {
      store: "home-depot",
      mode: "scrubber_proxy",
      connected: true,
      label: "Generic inventory scrubber proxy",
      message:
        "Using INVENTORY_SCRUBBER_ENDPOINT + API_KEY with store=home-depot.",
      envPresent: ["INVENTORY_SCRUBBER_ENDPOINT", "INVENTORY_SCRUBBER_API_KEY"],
      envMissing: [],
      docsPath,
    };
  }

  return {
    store: "home-depot",
    mode: "starter",
    connected: false,
    label: "Starter SKUs (not live HD)",
    message:
      "No Home Depot credentials. Using curated starter SKUs. Apply to The Home Depot Affiliate Program (Impact), then set HOME_DEPOT_IMPACT_FEED_URL — see docs.",
    envPresent: [],
    envMissing: [
      "HOME_DEPOT_IMPACT_FEED_URL",
      "or HOME_DEPOT_API_ENDPOINT + HOME_DEPOT_API_KEY",
    ],
    docsPath,
  };
}
