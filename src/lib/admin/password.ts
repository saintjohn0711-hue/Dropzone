import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_PREFIX = "scrypt";

/** Create a portable scrypt hash: scrypt$N$r$p$saltHex$hashHex */
export function hashPassword(password: string): string {
  const N = 16384;
  const r = 8;
  const p = 1;
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, { N, r, p });
  return `${SCRYPT_PREFIX}$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    if (stored.startsWith(`${SCRYPT_PREFIX}$`)) {
      const parts = stored.split("$");
      if (parts.length !== 6) return false;
      const N = Number(parts[1]);
      const r = Number(parts[2]);
      const p = Number(parts[3]);
      const salt = Buffer.from(parts[4], "hex");
      const expected = Buffer.from(parts[5], "hex");
      const actual = scryptSync(password, salt, expected.length, { N, r, p });
      return timingSafeEqual(actual, expected);
    }
    // Legacy sha256 hex (not preferred)
    const dig = createHash("sha256").update(password).digest("hex");
    const a = Buffer.from(dig);
    const b = Buffer.from(stored);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
