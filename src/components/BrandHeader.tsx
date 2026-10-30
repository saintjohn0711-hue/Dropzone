import Link from "next/link";

export function BrandHeader({
  title,
  showBack,
  backHref = "/",
  centerLogo,
}: {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  /** Home: logo image + tagline centered */
  centerLogo?: boolean;
}) {
  if (centerLogo) {
    return (
      <div className="header" style={{ textAlign: "center", paddingBottom: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dropzone-logo.jpg"
          alt="DropZone"
          style={{ height: 72, margin: "0 auto 2px", display: "block" }}
        />
        <div className="tagline" style={{ fontSize: 11 }}>
          What you need. Where you need it.
        </div>
      </div>
    );
  }

  return (
    <div
      className="header"
      style={showBack ? { display: "flex", alignItems: "center", gap: 10 } : undefined}
    >
      {showBack ? (
        <Link href={backHref} className="back" aria-label="Back">
          ←
        </Link>
      ) : null}
      <div className="logo" style={showBack ? { fontSize: 22 } : undefined}>
        {title ?? (
          <>
            Drop<span>Zone</span>
          </>
        )}
      </div>
    </div>
  );
}
