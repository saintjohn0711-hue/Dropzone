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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-dz-border bg-dz-dark/95 pb-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg justify-around pt-2">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[64px] flex-col items-center gap-0.5 px-2 py-1 text-[11px] transition-colors ${
                active ? "font-semibold text-dz-orange" : "text-dz-muted"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
