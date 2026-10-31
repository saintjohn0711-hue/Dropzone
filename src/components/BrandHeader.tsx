"use client";

import Link from "next/link";
import { LanguageToggle } from "./LanguageToggle";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type TitleKey =
  | "product"
  | "yourCart"
  | "pricingGuide"
  | "liveDrop"
  | "chatWithAlex"
  | "driverSignupNav"
  | "driverDashboardNav"
  | "driverLoginNav"
  | "checkoutNav"
  | "orderConfirmNav";

export function BrandHeader({
  title,
  titleKey,
  showBack,
  backHref = "/",
  centerLogo,
}: {
  title?: string;
  titleKey?: TitleKey;
  showBack?: boolean;
  backHref?: string;
  centerLogo?: boolean;
}) {
  const { t } = useLocale();
  const resolvedTitle = titleKey ? t[titleKey] : title;

  if (centerLogo) {
    return (
      <div className="header header-home">
        <div className="header-lang-float">
          <LanguageToggle />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dropzone-logo.jpg"
          alt={`DropZone — ${t.tagline}`}
          className="brand-logo"
        />
      </div>
    );
  }

  return (
    <div className="header header-row">
      <div className="header-leading">
        {showBack ? (
          <Link href={backHref} className="back" aria-label={t.back}>
            ←
          </Link>
        ) : null}
        {showBack ? (
          <div className="logo" style={{ fontSize: 22 }}>
            {resolvedTitle}
          </div>
        ) : (
          <div className="header-brand-inline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/dropzone-logo.jpg"
              alt="DropZone"
              className="brand-logo-sm"
            />
            <div>
              <div className="logo" style={{ fontSize: 20, lineHeight: 1.1 }}>
                {resolvedTitle ?? (
                  <>
                    Drop<span>Zone</span>
                  </>
                )}
              </div>
              <div className="tagline" style={{ fontSize: 10 }}>
                {t.tagline}
              </div>
            </div>
          </div>
        )}
      </div>
      <LanguageToggle />
    </div>
  );
}
