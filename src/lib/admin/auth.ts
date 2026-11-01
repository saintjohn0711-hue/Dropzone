import { DEMO_ADMIN } from "@/lib/admin/constants";
import { verifyPassword } from "@/lib/admin/password";

export type AdminIdentity = {
  email: string;
  displayName: string;
  demo: boolean;
  source: "env" | "demo" | "allowlist";
};

function envEmail(): string | null {
  const e = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return e || null;
}

function envHash(): string | null {
  return process.env.ADMIN_PASSWORD_HASH?.trim() || null;
}

function allowlist(): string[] {
  return (process.env.ADMIN_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** True when production secrets are configured (not demo mode). */
export function adminSecretsConfigured(): boolean {
  return Boolean(envEmail() && envHash());
}

export function getAdminAuthMode(): {
  mode: "env" | "demo";
  loginEmailHint: string;
  label: string | null;
} {
  if (adminSecretsConfigured()) {
    return {
      mode: "env",
      loginEmailHint: envEmail()!,
      label: null,
    };
  }
  return {
    mode: "demo",
    loginEmailHint: DEMO_ADMIN.email,
    label: DEMO_ADMIN.label,
  };
}

/**
 * Verify admin credentials.
 * Preferred: ADMIN_EMAIL + ADMIN_PASSWORD_HASH on DropZone Vercel.
 * Fallback: documented demo admin (clearly labeled).
 * Optional: ADMIN_ALLOWLIST emails + ADMIN_PASSWORD_HASH shared secret.
 */
export function authenticateAdmin(
  emailRaw: string,
  password: string,
): AdminIdentity | null {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) return null;

  const configuredEmail = envEmail();
  const hash = envHash();

  if (configuredEmail && hash) {
    if (email === configuredEmail && verifyPassword(password, hash)) {
      return {
        email,
        displayName: process.env.ADMIN_DISPLAY_NAME?.trim() || "Admin",
        demo: false,
        source: "env",
      };
    }
    // Allowlist sharing the same password hash
    if (allowlist().includes(email) && verifyPassword(password, hash)) {
      return {
        email,
        displayName: email.split("@")[0] || "Admin",
        demo: false,
        source: "allowlist",
      };
    }
    return null;
  }

  // Demo / soft seed when secrets unset
  if (
    email === DEMO_ADMIN.email.toLowerCase() &&
    password === DEMO_ADMIN.password
  ) {
    return {
      email: DEMO_ADMIN.email,
      displayName: DEMO_ADMIN.displayName,
      demo: true,
      source: "demo",
    };
  }

  return null;
}
