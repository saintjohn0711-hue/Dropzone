"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  adminFetch,
  clearStoredAdminToken,
  getStoredAdminToken,
} from "@/lib/admin/client";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [email, setEmail] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [checking, setChecking] = useState(!isLogin);

  const loadMe = useCallback(async () => {
    if (isLogin) {
      setChecking(false);
      return;
    }
    const token = getStoredAdminToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    try {
      const res = await adminFetch("/api/admin/me");
      const json = await res.json();
      if (!res.ok || !json.ok) {
        clearStoredAdminToken();
        router.replace("/admin/login");
        return;
      }
      setEmail(json.admin.email);
      setDemo(Boolean(json.admin.demo));
    } catch {
      router.replace("/admin/login");
      return;
    } finally {
      setChecking(false);
    }
  }, [isLogin, router]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  async function logout() {
    try {
      await adminFetch("/api/admin/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    clearStoredAdminToken();
    router.replace("/admin/login");
  }

  if (isLogin) {
    return <div className="admin-root">{children}</div>;
  }

  if (checking) {
    return (
      <div className="admin-root">
        <div className="admin-loading">Checking admin session…</div>
      </div>
    );
  }

  return (
    <div className="admin-root">
      <header className="admin-top">
        <div className="admin-brand">
          <span className="admin-mark">DZ</span>
          <div>
            <strong>DropZone Admin</strong>
            <p>Account management & control</p>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link${active ? " active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="admin-user">
          {demo ? <span className="admin-demo-pill">TEST ADMIN</span> : null}
          <span className="admin-email">{email}</span>
          <button type="button" className="admin-logout" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
