import { AdminDriverDetail } from "@/components/admin/AdminDriverDetail";

export default async function AdminDriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminDriverDetail id={id} />;
}
