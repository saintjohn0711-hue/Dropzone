"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const items = [
    { href: "/", label: t.navHome, icon: "🏠" },
    { href: "/#search", label: t.navSearch, icon: "🔍" },
    { href: "/account/orders", label: t.navOrders, icon: "📦" },
    { href: "/account", label: t.navAccount, icon: "👤" },
  ];

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
