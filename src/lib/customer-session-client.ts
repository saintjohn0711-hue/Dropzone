import {
  CUSTOMER_ID_STORAGE,
  CUSTOMER_SESSION_STORAGE,
} from "@/lib/customer-session";

export { CUSTOMER_ID_STORAGE, CUSTOMER_SESSION_STORAGE };

export function getStoredCustomerToken(): string | null {
  try {
    return localStorage.getItem(CUSTOMER_SESSION_STORAGE);
  } catch {
    return null;
  }
}

export function getStoredCustomerId(): string | null {
  try {
    return localStorage.getItem(CUSTOMER_ID_STORAGE);
  } catch {
    return null;
  }
}

export function clearStoredCustomerSession() {
  try {
    localStorage.removeItem(CUSTOMER_SESSION_STORAGE);
    localStorage.removeItem(CUSTOMER_ID_STORAGE);
  } catch {
    /* ignore */
  }
}

export function customerAuthHeaders(): HeadersInit {
  const token = getStoredCustomerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
