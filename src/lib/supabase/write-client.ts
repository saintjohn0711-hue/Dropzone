import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Prefer service role; fall back to anon for public RLS stubs. */
export function getWriteClient(): SupabaseClient | null {
  const admin = createAdminClient();
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isMissingRelation(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("schema cache")) ||
    Boolean(error.message?.includes("does not exist"))
  );
}
