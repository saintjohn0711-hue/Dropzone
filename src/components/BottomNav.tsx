"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/#search", label: "Search", icon: "🔍" },
  { href: "/cart", label: "Orders", icon: "📦" },
  { href: "/pricing", label: "Pricing", icon: "💲" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const active =
          item.href === "/" || item.href.startsWith("/#")
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`nav-item${active ? " active" : ""}`}
          >
            <div className="nav-icon">{item.icon}</div>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
