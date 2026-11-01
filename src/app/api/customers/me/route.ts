import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer-session";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireCustomer(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }

  const client = getWriteClient();
  let jobsites: Array<{
    id: string;
    label: string;
    address: string;
    created_at: string;
  }> = [];
  let hint: string | undefined;

  if (client) {
    const { data, error } = await client
      .from("customer_jobsites")
      .select("id, label, address, created_at")
      .eq("customer_id", auth.customer.id)
      .order("created_at", { ascending: false });
    if (error) {
      hint = isMissingRelation(error)
        ? "Run supabase-customers.sql for customer_jobsites"
        : error.message;
    } else {
      jobsites = data || [];
    }
  }

  return NextResponse.json({
    ok: true,
    customer: auth.customer,
    jobsites,
    hint,
  });
}
