import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DropZone — What you need. Where you need it.",
  description:
    "Jobsite delivery shell: browse box-store inventory, pick vehicle & rush, drop to site.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
