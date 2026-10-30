import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  showNav = true,
}: {
  children: React.ReactNode;
  showNav?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <div className={`flex-1 ${showNav ? "pb-24" : ""}`}>{children}</div>
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
