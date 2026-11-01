import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = {
  title: "DropZone Admin",
  description: "DropZone account management and control",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
