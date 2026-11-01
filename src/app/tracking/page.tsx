import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";
import { TrackingView } from "@/components/TrackingView";

export default function TrackingPage() {
  return (
    <AppShell>
      <BrandHeader titleKey="liveDrop" />
      <Suspense fallback={<p className="empty-state">Loading…</p>}>
        <TrackingView />
      </Suspense>
    </AppShell>
  );
}
