/**
 * Lowe's connection modes (ToS-safe only — no HTML scrape).
 *
 * Preferred: Lowe's Affiliate / Impact catalog feed when available.
 * Alternate: licensed partner REST with LOWES_API_*.
 * Shared: INVENTORY_SCRUBBER_* proxy with store=lowes.
 */

export type LowesConnectionMode =
  | "impact_feed"
  | "partner_api"
  | "scrubber_proxy"
  | "starter";

export type LowesConnectionStatus = {
  store: "lowes";
  mode: LowesConnectionMode;
  connected: boolean;
  label: string;
  message: string;
  envPresent: string[];
  envMissing: string[];
  docsPath: string;
};

export function getLowesConnectionStatus(): LowesConnectionStatus {
  const docsPath = "/cursor/stores/self/docs/lowes-inventory.md";
  const impact = Boolean(process.env.LOWES_IMPACT_FEED_URL?.trim());
  const partner =
    Boolean(process.env.LOWES_API_ENDPOINT?.trim()) &&
    Boolean(process.env.LOWES_API_KEY?.trim());
  const scrubber =
    Boolean(process.env.INVENTORY_SCRUBBER_ENDPOINT?.trim()) &&
    Boolean(process.env.INVENTORY_SCRUBBER_API_KEY?.trim());

  if (impact) {
    return {
      store: "lowes",
      mode: "impact_feed",
      connected: true,
      label: "Lowe's Impact catalog feed",
      message:
        "Using LOWES_IMPACT_FEED_URL (affiliate product feed — official path via Impact).",
      envPresent: ["LOWES_IMPACT_FEED_URL"],
      envMissing: [],
      docsPath,
    };
  }

  if (partner) {
    return {
      store: "lowes",
      mode: "partner_api",
      connected: true,
      label: "Lowe's partner REST API",
      message:
        "Using LOWES_API_ENDPOINT + LOWES_API_KEY (licensed/partner JSON).",
      envPresent: ["LOWES_API_ENDPOINT", "LOWES_API_KEY"],
      envMissing: [],
      docsPath,
    };
  }

  if (scrubber) {
    return {
      store: "lowes",
      mode: "scrubber_proxy",
      connected: true,
      label: "Generic inventory scrubber proxy",
      message:
        "Using INVENTORY_SCRUBBER_ENDPOINT + API_KEY with store=lowes.",
      envPresent: ["INVENTORY_SCRUBBER_ENDPOINT", "INVENTORY_SCRUBBER_API_KEY"],
      envMissing: [],
      docsPath,
    };
  }

  return {
    store: "lowes",
    mode: "starter",
    connected: false,
    label: "Starter SKUs (not live Lowe's)",
    message:
      "No Lowe's credentials. Using curated starter SKUs. Apply via Impact / partner feed, then set LOWES_IMPACT_FEED_URL — see docs.",
    envPresent: [],
    envMissing: [
      "LOWES_IMPACT_FEED_URL",
      "or LOWES_API_ENDPOINT + LOWES_API_KEY",
    ],
    docsPath,
  };
}
