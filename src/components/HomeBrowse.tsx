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

    return list;
  }, [category, storeId, query, sort]);

  return (
    <div>
      <div id="search" className="space-y-3 px-4 py-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search materials, tools, supplies…"
          className="w-full rounded-xl border border-dz-border bg-dz-card px-4 py-3 text-sm text-dz-text outline-none placeholder:text-dz-muted focus:border-dz-orange"
        />
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="flex-1 rounded-xl border border-dz-border bg-dz-card px-3 py-2 text-sm text-dz-text"
          >
            <option value="default">Sort: Featured</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="eta">Fastest ETA</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className="min-w-[64px] shrink-0 text-center"
          >
            <div
              className={`mx-auto mb-1.5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-xl transition-colors ${
                c === category ? "bg-dz-orange" : "bg-dz-card"
              }`}
            >
              {categoryIcons[c] ?? "📦"}
            </div>
            <span className="text-[11px] text-dz-muted">{c}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stores.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStoreId(s.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs transition-colors ${
              storeId === s.id
                ? "border-dz-orange bg-dz-orange text-white"
                : "border-dz-mid bg-dz-card text-dz-text"
            }`}
          >
            {s.name}
            {s.dist ? ` · ${s.dist}` : ""}
          </button>
        ))}
      </div>

      <div className="px-4 pb-2">
        <h2 className="font-display text-lg font-bold">
          Near you <span className="text-sm font-medium text-dz-orange">· Fast Drop</span>
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-6">
        {filtered.map((p, i) => (
          <Link
            key={p.id}
            href={`/product/${p.id}`}
            className="animate-fade-up overflow-hidden rounded-2xl bg-dz-card"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div
              className="h-28 bg-cover bg-center"
              style={{ backgroundImage: `url(${p.img})` }}
              role="img"
              aria-label={p.name}
            />
            <div className="p-3">
              <span className="mb-1 inline-block rounded bg-dz-orange px-1.5 py-0.5 text-[9px] font-bold text-white">
                FAST DROP
              </span>
              <div className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</div>
              <div className="mt-1 text-[11px] text-dz-muted">
                {p.store} · {p.eta}
              </div>
              <div className="mt-1 font-bold text-dz-orange">${p.price.toFixed(2)}</div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <p className="col-span-2 py-10 text-center text-sm text-dz-muted">
            No products match your filters.
          </p>
        ) : null}
      </div>

      <footer className="px-4 pb-8 text-center text-[13px] text-dz-muted">
        DropZone · jobsite delivery shell
        <div className="mt-2 flex justify-center gap-4 text-dz-orange">
          <span>Facebook</span>
          <span>Instagram</span>
        </div>
      </footer>
    </div>
  );
}
