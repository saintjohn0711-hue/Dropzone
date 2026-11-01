import { ADMIN_SESSION_STORAGE } from "@/lib/admin/constants";

export function getStoredAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ADMIN_SESSION_STORAGE);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string) {
  localStorage.setItem(ADMIN_SESSION_STORAGE, token);
}

export function clearStoredAdminToken() {
  localStorage.removeItem(ADMIN_SESSION_STORAGE);
}

export function adminAuthHeaders(): HeadersInit {
  const token = getStoredAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function adminFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = getStoredAdminToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers, credentials: "include" });
}
