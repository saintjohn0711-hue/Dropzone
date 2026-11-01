import type { SupabaseClient } from "@supabase/supabase-js";

export const POD_BUCKET = "proof-of-delivery";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PodUploadResult = {
  path: string | null;
  status: "stored" | "deferred" | "none";
  capturedAt: string;
  note?: string;
  previewUrl?: string | null;
};

function extFor(mime: string, fallbackName?: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (fallbackName?.includes(".")) {
    return fallbackName.split(".").pop()!.toLowerCase().slice(0, 5);
  }
  return "jpg";
}

/**
 * Upload POD photo to private Supabase Storage bucket on DropZone only.
 * Soft-deferred when bucket/SQL not ready — never writes images to git.
 */
export async function uploadProofOfDelivery(
  client: SupabaseClient | null,
  orderId: string,
  file: File | Blob | null | undefined,
  fileName?: string,
): Promise<PodUploadResult> {
  const capturedAt = new Date().toISOString();
  if (!file) {
    return { path: null, status: "none", capturedAt };
  }

  const mime = (file as File).type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return {
      path: null,
      status: "deferred",
      capturedAt,
      note: `Unsupported POD type ${mime}`,
    };
  }
  if (typeof file.size === "number" && file.size > MAX_BYTES) {
    return {
      path: null,
      status: "deferred",
      capturedAt,
      note: "POD photo exceeds 5MB limit",
    };
  }

  if (!client) {
    return {
      path: null,
      status: "deferred",
      capturedAt,
      note: "TODO: SUPABASE_SERVICE_ROLE_KEY + proof-of-delivery bucket required. Run supabase-pod.sql.",
    };
  }

  const ext = extFor(mime, fileName || (file as File).name);
  const path = `${orderId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage.from(POD_BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: true,
  });

  if (error) {
    return {
      path: null,
      status: "deferred",
      capturedAt,
      note: error.message.includes("Bucket")
        ? "TODO: Create private bucket via supabase-pod.sql, then re-upload POD."
        : error.message,
    };
  }

  let previewUrl: string | null = null;
  try {
    const signed = await client.storage
      .from(POD_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    previewUrl = signed.data?.signedUrl || null;
  } catch {
    previewUrl = null;
  }

  return {
    path,
    status: "stored",
    capturedAt,
    previewUrl,
  };
}

export async function signedPodUrl(
  client: SupabaseClient | null,
  path: string | null | undefined,
): Promise<string | null> {
  if (!client || !path) return null;
  try {
    const signed = await client.storage
      .from(POD_BUCKET)
      .createSignedUrl(path, 60 * 60);
    return signed.data?.signedUrl || null;
  } catch {
    return null;
  }
}

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
