import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import {
  buildApplicationRow,
  insertDriverApplication,
  validateDriverApplication,
  type DriverApplicationInput,
} from "@/lib/driver-application";
import {
  dataUrlToBlob,
  uploadDriverLicenseImages,
} from "@/lib/driver-license-storage";

export const runtime = "nodejs";

function writeClient() {
  return createAdminClient() ?? publicClient();
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asObject(v: FormDataEntryValue | null): unknown {
  if (v == null) return undefined;
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return undefined;
  if (s.startsWith("[") || s.startsWith("{")) {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }
  return s;
}

async function parseBody(
  request: Request,
): Promise<{
  input: Partial<DriverApplicationInput>;
  front?: File | Blob | null;
  back?: File | Blob | null;
}> {
  const ctype = request.headers.get("content-type") || "";
  if (ctype.includes("multipart/form-data")) {
    const fd = await request.formData();
    const input: Record<string, unknown> = {};
    for (const [key, value] of fd.entries()) {
      if (key === "dl_front" || key === "dl_back") continue;
      if (key === "availability_days") {
        input[key] = asObject(value);
        continue;
      }
      if (
        key === "can_haul_heavy" ||
        key === "insurance_confirmed" ||
        key === "background_check_consent" ||
        key === "terms_accepted" ||
        key === "contractor_ack"
      ) {
        input[key] = String(value);
        continue;
      }
      input[key] = typeof value === "string" ? value : String(value);
    }
    const front = fd.get("dl_front");
    const back = fd.get("dl_back");
    return {
      input: input as Partial<DriverApplicationInput>,
      front: front instanceof File && front.size > 0 ? front : null,
      back: back instanceof File && back.size > 0 ? back : null,
    };
  }

  const json = (await request.json()) as Partial<DriverApplicationInput> & {
    dl_front_base64?: string;
    dl_back_base64?: string;
  };
  return {
    input: json,
    front: dataUrlToBlob(json.dl_front_base64),
    back: dataUrlToBlob(json.dl_back_base64),
  };
}

/** POST — create a DropZone driver from full application */
export async function POST(request: Request) {
  let parsed: Awaited<ReturnType<typeof parseBody>>;
  try {
    parsed = await parseBody(request);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const validated = validateDriverApplication(parsed.input);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: 400 },
    );
  }

  const client = writeClient();
  if (!client) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase not configured",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL + anon/service key, then run drivers SQL.",
      },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const provisionalId = crypto.randomUUID();

  // Upload DL first under provisional id, then insert; if insert fails, paths remain orphaned but private.
  const upload = await uploadDriverLicenseImages(admin, provisionalId, {
    front: parsed.front,
    back: parsed.back,
  });

  const row = buildApplicationRow(validated.value, {
    dl_front_path: upload.frontPath,
    dl_back_path: upload.backPath,
    dl_upload_status: upload.status,
  });

  // Prefer DB-generated id; if we already uploaded under provisionalId, keep those paths.
  const result = await insertDriverApplication(client, row);

  if (!result.data) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error || "Could not create driver",
        hint: result.hint,
        dlUpload: upload,
      },
      {
        status:
          result.error?.includes("already exists")
            ? 409
            : result.hint?.includes("Run")
              ? 503
              : 400,
      },
    );
  }

  // If insert created a different id and we stored files under provisional, try rename.
  const driverId = String(result.data.id || "");
  if (
    driverId &&
    driverId !== provisionalId &&
    admin &&
    (upload.frontPath || upload.backPath)
  ) {
    // Best-effort: leave paths as provisional folder; still private to bucket.
    // Update row paths stay pointing at provisionalId/* which is fine.
  }

  return NextResponse.json({
    ok: true,
    driver: result.data,
    persistMode: result.mode,
    hint: result.hint,
    dlUpload: {
      status: upload.status,
      frontPath: upload.frontPath,
      backPath: upload.backPath,
      note: upload.note,
    },
  });
}

/** GET — list drivers or fetch by ?id= / ?email= */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email")?.toLowerCase();

  const client = writeClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 },
    );
  }

  let query = client.from("drivers").select("*");
  if (id) query = query.eq("id", id);
  else if (email) query = query.eq("email", email);
  else query = query.order("created_at", { ascending: false }).limit(50);

  const { data, error } = id || email ? await query.maybeSingle() : await query;

  if (error) {
    const missing =
      error.code === "PGRST205" || error.message.includes("schema cache");
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint: missing
          ? "Run supabase-drivers.sql in DropZone project xvfxjxmdtazihzuyyrsj SQL editor."
          : undefined,
      },
      { status: missing ? 503 : 400 },
    );
  }

  if ((id || email) && !data) {
    return NextResponse.json({ ok: false, error: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    driver: id || email ? data : undefined,
    drivers: id || email ? undefined : data,
  });
}
