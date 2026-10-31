/** Client-safe session storage key (raw token). Server stores only SHA-256. */
export const DRIVER_SESSION_STORAGE = "dz-driver-session";

export function getStoredDriverToken(): string | null {
  try {
    return localStorage.getItem(DRIVER_SESSION_STORAGE);
  } catch {
    return null;
  }
}

export function clearStoredDriverToken() {
  try {
    localStorage.removeItem(DRIVER_SESSION_STORAGE);
  } catch {
    /* ignore */
  }
}

export function authHeaders(): HeadersInit {
  const token = getStoredDriverToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
