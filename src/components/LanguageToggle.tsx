"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function LanguageToggle({ compact }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="lang-toggle"
      role="group"
      aria-label="Language"
      style={compact ? { fontSize: 11 } : undefined}
    >
      <button
        type="button"
        className={locale === "en" ? "active" : undefined}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <span className="lang-sep">|</span>
      <button
        type="button"
        className={locale === "es" ? "active" : undefined}
        onClick={() => setLocale("es")}
      >
        ES
      </button>
    </div>
  );
}
