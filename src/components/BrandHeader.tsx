import Link from "next/link";

export function BrandHeader({
  showBack,
  backHref = "/",
}: {
  showBack?: boolean;
  backHref?: string;
}) {
  return (
    <header className="bg-dz-dark px-4 pb-4 pt-3">
      <div className="flex items-start gap-3">
        {showBack ? (
          <Link
            href={backHref}
            className="mt-1 rounded-lg border border-dz-border px-2 py-1 text-sm text-dz-muted hover:text-dz-text"
            aria-label="Back"
          >
            ←
          </Link>
        ) : null}
        <div>
          <Link href="/" className="font-display text-2xl font-extrabold tracking-tight">
            Drop<span className="text-dz-orange">Zone</span>
          </Link>
          <p className="mt-0.5 text-[11px] text-dz-muted">
            What you need. Where you need it.
          </p>
        </div>
      </div>
    </header>
  );
}
