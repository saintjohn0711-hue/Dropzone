import type { SupabaseClient } from "@supabase/supabase-js";

export const DRIVER_LICENSE_BUCKET = "driver-licenses";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export type LicenseUploadResult = {
  frontPath: string | null;
  backPath: string | null;
  status: "stored" | "deferred" | "none";
  note?: string;
};

function extFor(mime: string, fallbackName?: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  if (fallbackName?.includes(".")) {
    return fallbackName.split(".").pop()!.toLowerCase().slice(0, 5);
  }
  return "jpg";
}

async function uploadOne(
  client: SupabaseClient,
  driverId: string,
  side: "front" | "back",
  file: File | Blob,
  fileName?: string,
): Promise<{ path: string | null; deferred: boolean; error?: string }> {
  const mime = (file as File).type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return {
      path: null,
      deferred: true,
      error: `Unsupported type ${mime} for DL ${side}`,
    };
  }
  if (typeof file.size === "number" && file.size > MAX_BYTES) {
    return {
      path: null,
      deferred: true,
      error: `DL ${side} exceeds 5MB limit`,
    };
  }

  const ext = extFor(mime, fileName || (file as File).name);
  const path = `${driverId}/${side}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage
    .from(DRIVER_LICENSE_BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: true,
    });

  if (error) {
    // TODO: If bucket missing, persist base64 in a private vault or re-queue after
    // running supabase-driver-application.sql (creates driver-licenses bucket).
    // Do NOT commit license images to git or public buckets.
    return {
      path: null,
      deferred: true,
      error: error.message,
    };
  }

  return { path, deferred: false };
}

/**
 * Upload DL images to private Supabase Storage bucket on DropZone project only.
 * Soft-deferred when bucket/SQL not ready — never writes secrets to git.
 */
export async function uploadDriverLicenseImages(
  client: SupabaseClient | null,
  driverId: string,
  files: { front?: File | Blob | null; back?: File | Blob | null },
): Promise<LicenseUploadResult> {
  if (!files.front && !files.back) {
    return { frontPath: null, backPath: null, status: "none" };
  }

  if (!client) {
    return {
      frontPath: null,
      backPath: null,
      status: "deferred",
      note: "TODO: SUPABASE_SERVICE_ROLE_KEY required to store DL images in private bucket driver-licenses. Application saved; re-upload after env + SQL.",
    };
  }

  let frontPath: string | null = null;
  let backPath: string | null = null;
  let deferred = false;
  const notes: string[] = [];

  if (files.front) {
    const r = await uploadOne(
      client,
      driverId,
      "front",
      files.front,
      (files.front as File).name,
    );
    frontPath = r.path;
    if (r.deferred) {
      deferred = true;
      if (r.error) notes.push(r.error);
    }
  }

  if (files.back) {
    const r = await uploadOne(
      client,
      driverId,
      "back",
      files.back,
      (files.back as File).name,
    );
    backPath = r.path;
    if (r.deferred) {
      deferred = true;
      if (r.error) notes.push(r.error);
    }
  }

  if (frontPath || backPath) {
    return {
      frontPath,
      backPath,
      status: deferred ? "deferred" : "stored",
      note: notes.length ? notes.join("; ") : undefined,
    };
  }

  return {
    frontPath: null,
    backPath: null,
    status: "deferred",
    note:
      notes.join("; ") ||
      "TODO: DL upload deferred — create private bucket via supabase-driver-application.sql, then re-submit images.",
  };
}

/** Parse optional base64 data-URL from JSON body (fallback when not using multipart). */
export function dataUrlToBlob(
  dataUrl: string | undefined | null,
): Blob | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const bin = Buffer.from(m[2], "base64");
  if (bin.length > MAX_BYTES) return null;
  return new Blob([bin], { type: mime });
}
