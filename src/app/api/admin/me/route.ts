import { NextResponse } from "next/server";
import { getAdminAuthMode } from "@/lib/admin/auth";
import { requireAdmin } from "@/lib/admin/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint, authMode: getAdminAuthMode() },
      { status: auth.status },
    );
  }
  return NextResponse.json({
    ok: true,
    admin: {
      email: auth.admin.email,
      displayName: auth.admin.displayName,
      demo: auth.admin.demo,
      soft: auth.admin.soft,
    },
    authMode: getAdminAuthMode(),
  });
}
