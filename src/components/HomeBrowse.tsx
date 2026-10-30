"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  categories,
  categoryIcons,
  products,
  stores,
  type Product,
} from "@/data/products";

export function HomeBrowse() {
  const [category, setCategory] = useState<string>("All");
  const [storeId, setStoreId] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [showCount, setShowCount] = useState("6");

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
  }, [category, storeId, query, sort, showCount]);

  return (
    <>
      <div id="search" className="search-bar">
        <span>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you need on site?"
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
            {s.name}
            {s.dist ? ` • ${s.dist}` : ""}
          </button>
        ))}
      </div>

      <div className="filter-row">
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="default">Sort: Default</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="eta">Fastest ETA</option>
        </select>
        <select value={showCount} onChange={(e) => setShowCount(e.target.value)}>
          <option value="4">Show 4</option>
          <option value="6">Show 6</option>
          <option value="8">Show 8</option>
          <option value="all">Show All</option>
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
            <div style={{ fontSize: 11 }}>{c}</div>
          </button>
        ))}
      </div>

      <div className="section-title">
        Fast drops near you <span>See all</span>
      </div>

      <div className="products">
        {filtered.map((p) => (
          <Link key={p.id} href={`/product/${p.id}`} className="product-card">
            <div
              className="product-img"
              style={{ backgroundImage: `url(${p.img})` }}
            />
            <div className="product-info">
              <span className="badge">FAST DROP</span>
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
            No products match your filters.
          </p>
        ) : null}
      </div>

      <div className="driver-banner">
        <div style={{ fontSize: 28 }}>🚐</div>
        <div style={{ flex: 1 }}>
          <h3>Want to be a DropZone driver?</h3>
          <p>
            Car, pickup, box truck, or drone? Register your vehicle and earn on
            jobsite drops.
          </p>
        </div>
        <button type="button" className="driver-btn">
          Apply
        </button>
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px 16px 30px",
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 8 }}>Follow DropZone</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <span style={{ color: "var(--orange)", fontWeight: 600 }}>f Facebook</span>
          <span style={{ color: "var(--orange)", fontWeight: 600 }}>📷 Instagram</span>
        </div>
      </div>
    </>
  );
}
