"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  categories,
  categoryIcons,
  stores,
  type Product,
} from "@/data/products";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function HomeBrowse({
  products,
  catalogSource = "seed",
}: {
  products: Product[];
  catalogSource?: "supabase" | "seed";
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [category, setCategory] = useState<string>("All");
  const [storeId, setStoreId] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [showCount, setShowCount] = useState("6");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  async function refreshInventory() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/inventory/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "box-store-scrubber", dryRun: false }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setRefreshMsg(
          t.inventoryRefreshed.replace(
            "{n}",
            String(json.scrub?.persisted ?? 0),
          ),
        );
        router.refresh();
      } else {
        setRefreshMsg(json.error || t.inventoryRefreshError);
      }
    } catch {
      setRefreshMsg(t.inventoryRefreshError);
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    let list: Product[] = products.filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (storeId === "all" || p.storeSlug === storeId) &&
        p.name.toLowerCase().includes(query.toLowerCase()),
    );

    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "eta")
      list = [...list].sort((a, b) => parseInt(a.eta, 10) - parseInt(b.eta, 10));

    if (showCount !== "all") list = list.slice(0, parseInt(showCount, 10));
    return list;
  }, [products, category, storeId, query, sort, showCount]);

  return (
    <>
      <div id="search" className="search-bar">
        <span>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
        />
      </div>

      <div className="store-selector">
        {stores.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`store-chip${storeId === s.id ? " active" : ""}`}
            onClick={() => setStoreId(s.id)}
          >
            {t.stores[s.id as keyof typeof t.stores] ?? s.name}
            {s.dist ? ` • ${s.dist}` : ""}
          </button>
        ))}
      </div>

      <div className="filter-row">
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="default">{t.sortDefault}</option>
          <option value="price-asc">{t.sortPriceAsc}</option>
          <option value="price-desc">{t.sortPriceDesc}</option>
          <option value="eta">{t.sortEta}</option>
        </select>
        <select value={showCount} onChange={(e) => setShowCount(e.target.value)}>
          <option value="4">{t.show4}</option>
          <option value="6">{t.show6}</option>
          <option value="8">{t.show8}</option>
          <option value="all">{t.showAll}</option>
        </select>
      </div>

      <div className="categories">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`cat${c === category ? " active" : ""}`}
            onClick={() => setCategory(c)}
          >
            <div className="cat-icon">{categoryIcons[c] ?? "📦"}</div>
            <div style={{ fontSize: 11 }}>
              {t.categories[c as keyof typeof t.categories] ?? c}
            </div>
          </button>
        ))}
      </div>

      <div className="section-title">
        {t.fastDropsNearYou}{" "}
        <span>
          {catalogSource === "supabase" ? t.liveOffers : t.demoCatalog} · {t.seeAll}
        </span>
      </div>

      <div className="inventory-refresh-row">
        <button
          type="button"
          className="inventory-refresh-btn"
          disabled={refreshing}
          onClick={refreshInventory}
        >
          {refreshing ? t.inventoryRefreshing : t.inventoryRefresh}
        </button>
        {refreshMsg ? <span className="inventory-refresh-msg">{refreshMsg}</span> : null}
      </div>

      <div className="products">
        {filtered.map((p) => (
          <Link key={p.id} href={`/product/${p.id}`} className="product-card">
            <div
              className="product-img"
              style={{ backgroundImage: `url(${p.img})` }}
            />
            <div className="product-info">
              <span className="badge">{t.fastDrop}</span>
              <div className="product-name">{p.name}</div>
              <div className="product-store">
                {p.store} • {p.eta}
              </div>
              <div className="product-price">${p.price.toFixed(2)}</div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <p className="empty-state" style={{ gridColumn: "1 / -1" }}>
            {t.noProducts}
          </p>
        ) : null}
      </div>

      <div className="driver-banner">
        <div style={{ fontSize: 28 }}>🚐</div>
        <div style={{ flex: 1 }}>
          <h3>{t.driverTitle}</h3>
          <p>{t.driverBody}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link href="/driver" className="driver-btn">
            {t.apply}
          </Link>
          <Link href="/driver/login" className="driver-btn-secondary">
            {t.driverLoginCta}
          </Link>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px 16px 30px",
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 8 }}>{t.follow}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <span style={{ color: "var(--orange)", fontWeight: 600 }}>f Facebook</span>
          <span style={{ color: "var(--orange)", fontWeight: 600 }}>📷 Instagram</span>
        </div>
      </div>
    </>
  );
}
