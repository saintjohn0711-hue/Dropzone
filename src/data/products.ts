export type WeightClass = "light" | "medium" | "heavy";

export type Product = {
  id: string;
  name: string;
  store: string;
  storeSlug: string;
  sku: string;
  price: number;
  currency: string;
  eta: string;
  category: string;
  weight: WeightClass;
  img: string;
  stock: string;
  stockSignal: "in_stock" | "limited" | "low";
};

export type StoreChip = {
  id: string;
  name: string;
  dist: string;
};

export const stores: StoreChip[] = [
  { id: "all", name: "All Stores", dist: "" },
  { id: "home-depot", name: "Home Depot", dist: "1.2 mi" },
  { id: "lowes", name: "Lowe's", dist: "2.4 mi" },
  { id: "local", name: "Local Suppliers", dist: "0.8 mi" },
  { id: "office-depot", name: "Office Depot", dist: "3.1 mi" },
];

export const categories = [
  "All",
  "Lumber",
  "Hardware",
  "Electrical",
  "Plumbing",
  "Paint",
  "Materials",
  "Office",
] as const;

export const products: Product[] = [
  {
    id: "1",
    name: "2x4 Studs (8 ft) - Bundle",
    store: "Home Depot",
    storeSlug: "home-depot",
    sku: "HD-2048-BUNDLE",
    price: 24.5,
    currency: "USD",
    eta: "45 min",
    category: "Lumber",
    weight: "heavy",
    img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
    stock: "In stock nearby",
    stockSignal: "in_stock",
  },
  {
    id: "2",
    name: "Portland Cement 94 lb",
    store: "Lowe's",
    storeSlug: "lowes",
    sku: "LW-CEM-94",
    price: 14.75,
    currency: "USD",
    eta: "60 min",
    category: "Materials",
    weight: "heavy",
    img: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80",
    stock: "12 bags available",
    stockSignal: "limited",
  },
  {
    id: "3",
    name: "Structural Screws #10 (200 ct)",
    store: "Home Depot",
    storeSlug: "home-depot",
    sku: "HD-SCR-10-200",
    price: 28.9,
    currency: "USD",
    eta: "35 min",
    category: "Hardware",
    weight: "light",
    img: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80",
    stock: "In stock",
    stockSignal: "in_stock",
  },
  {
    id: "4",
    name: "Romex 12/2 Wire (250 ft)",
    store: "Electrical Supply",
    storeSlug: "local",
    sku: "LOC-RMX-122-250",
    price: 89.0,
    currency: "USD",
    eta: "50 min",
    category: "Electrical",
    weight: "medium",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    stock: "Limited stock",
    stockSignal: "limited",
  },
  {
    id: "5",
    name: "Drywall Sheets 4x8",
    store: "Lowe's",
    storeSlug: "lowes",
    sku: "LW-DW-48",
    price: 18.25,
    currency: "USD",
    eta: "55 min",
    category: "Materials",
    weight: "heavy",
    img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
    stock: "In stock",
    stockSignal: "in_stock",
  },
  {
    id: "6",
    name: "Paint - Interior White (1 gal)",
    store: "Home Depot",
    storeSlug: "home-depot",
    sku: "HD-PNT-WHT-1G",
    price: 32.4,
    currency: "USD",
    eta: "40 min",
    category: "Paint",
    weight: "medium",
    img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80",
    stock: "In stock",
    stockSignal: "in_stock",
  },
  {
    id: "7",
    name: "Office Paper Case (10 reams)",
    store: "Office Depot",
    storeSlug: "office-depot",
    sku: "OD-PAPER-10",
    price: 45.0,
    currency: "USD",
    eta: "70 min",
    category: "Office",
    weight: "light",
    img: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80",
    stock: "In stock",
    stockSignal: "in_stock",
  },
  {
    id: "8",
    name: 'PVC Pipe 1" (10 ft)',
    store: "Plumbing Supply",
    storeSlug: "local",
    sku: "LOC-PVC-1-10",
    price: 12.5,
    currency: "USD",
    eta: "45 min",
    category: "Plumbing",
    weight: "medium",
    img: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80",
    stock: "In stock",
    stockSignal: "in_stock",
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getVehicleOptions(weight: WeightClass) {
  if (weight === "light") {
    return [
      { id: "car", icon: "🚗", name: "Car / Van", desc: "Small items", fee: 6.99 },
      { id: "drone", icon: "🚁", name: "Drone", desc: "Ultra-light & urgent", fee: 12.99 },
    ];
  }
  if (weight === "medium") {
    return [
      { id: "car", icon: "🚗", name: "Car / Van", desc: "Fits most orders", fee: 8.99 },
      { id: "pickup", icon: "🛻", name: "Pickup Truck", desc: "Bulkier loads", fee: 12.99 },
    ];
  }
  return [
    { id: "pickup", icon: "🛻", name: "Pickup Truck", desc: "Lumber & bags", fee: 14.99 },
    { id: "box", icon: "🚛", name: "Box Truck / Flatbed", desc: "Heavy or long materials", fee: 24.99 },
  ];
}

export const categoryIcons: Record<string, string> = {
  All: "📦",
  Lumber: "🪵",
  Hardware: "🔩",
  Electrical: "⚡",
  Plumbing: "🔧",
  Paint: "🎨",
  Materials: "🧱",
  Office: "📋",
};
