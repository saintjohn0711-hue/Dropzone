export type StockSignal = "in_stock" | "limited" | "low" | "out" | "unknown";

export type InventoryOffer = {
  sku: string;
  storeSlug: string;
  name: string;
  price: number;
  currency: string;
  stockSignal: StockSignal;
  fetchedAt: string;
  category?: string;
  raw?: Record<string, unknown>;
};

export type ScrubOptions = {
  storeSlug?: string;
  dryRun?: boolean;
  limit?: number;
};

export type ScrubResult = {
  source: string;
  dryRun: boolean;
  offers: InventoryOffer[];
  persisted: number;
  message: string;
};

export interface StoreInventorySource {
  readonly id: string;
  readonly label: string;
  fetchOffers(options?: ScrubOptions): Promise<InventoryOffer[]>;
}
