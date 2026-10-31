"use client";

import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  showNav = true,
}: {
  children: React.ReactNode;
  showNav?: boolean;
}) {
  return (
    <div className="phone">
      <div className="screen-area" style={showNav ? undefined : { paddingBottom: 0 }}>
        {children}
      </div>
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
