import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-shot schema apply for DropZone.
 * POST with header x-migrate-secret matching MIGRATE_SECRET (or DROPZONE_MIGRATE_SECRET).
 * Uses SUPABASE_SERVICE_ROLE_KEY against the project SQL/pg endpoints.
 * Safe to remove after tables are confirmed.
 */
export async function POST(request: Request) {
  const expected =
    process.env.MIGRATE_SECRET || process.env.DROPZONE_MIGRATE_SECRET || "dropzone-migrate-once";
  const provided = request.headers.get("x-migrate-secret");
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const projectRef = new URL(url).hostname.split(".")[0];
  const sqlPath = join(process.cwd(), "supabase/migrations/20261030000001_init.sql");
  const sql = readFileSync(sqlPath, "utf8");

  const attempts: Array<{ endpoint: string; status: number; body: string }> = [];

  // 1) Project pg-meta style query (Studio-compatible)
  const pgEndpoints = [
    `${url}/pg/query`,
    `${url}/postgres/v1/query`,
  ];

  for (const endpoint of pgEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      const body = (await res.text()).slice(0, 500);
      attempts.push({ endpoint, status: res.status, body });
      if (res.ok) {
        const verify = await verifyTables(url, key);
        return NextResponse.json({ ok: true, method: endpoint, verify, projectRef });
      }
    } catch (e) {
      attempts.push({
        endpoint,
        status: 0,
        body: e instanceof Error ? e.message : "fetch failed",
      });
    }
  }

  // 2) Management API migration apply (needs SUPABASE_ACCESS_TOKEN PAT)
  const pat = process.env.SUPABASE_ACCESS_TOKEN;
  if (pat) {
    const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/migrations`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "20261030000001_init", query: sql }),
    });
    const body = (await res.text()).slice(0, 500);
    attempts.push({ endpoint, status: res.status, body });
    if (res.ok) {
      const verify = await verifyTables(url, key);
      return NextResponse.json({ ok: true, method: "management_migrations", verify, projectRef });
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: "could not execute DDL via available endpoints",
      hint: "Paste supabase/migrations/20261030000001_init.sql in Supabase SQL Editor, or set SUPABASE_ACCESS_TOKEN (Management API PAT).",
      sqlEditor: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
      attempts,
      projectRef,
    },
    { status: 502 },
  );
}

export async function GET(request: Request) {
  const expected =
    process.env.MIGRATE_SECRET || process.env.DROPZONE_MIGRATE_SECRET || "dropzone-migrate-once";
  const provided = request.headers.get("x-migrate-secret");
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "missing supabase env" }, { status: 500 });
  }

  const verify = await verifyTables(url, key);
  return NextResponse.json({
    ok: true,
    projectRef: new URL(url).hostname.split(".")[0],
    verify,
  });
}

async function verifyTables(url: string, key: string) {
  const tables = [
    "stores",
    "products",
    "product_offers",
    "carts",
    "cart_items",
    "orders",
  ] as const;
  const out: Record<string, { http: number; present: boolean }> = {};
  for (const t of tables) {
    const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=0`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    });
    out[t] = { http: res.status, present: res.status === 200 };
  }
  return out;
}
