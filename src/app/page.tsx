import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { HomeBrowse } from "@/components/HomeBrowse";

export default function HomePage() {
  return (
    <AppShell>
      <BrandHeader />
      <HomeBrowse />
    </AppShell>
  );
}
