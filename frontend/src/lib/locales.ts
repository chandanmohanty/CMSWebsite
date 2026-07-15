import type { SitePayload } from "./types";

/** Display names for the locale picker (admin) and language selector (site). */
export const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  hi: "हिन्दी",
  ar: "العربية",
  zh: "中文",
  ja: "日本語",
  ru: "Русский",
};

export const localeName = (code: string): string => LOCALE_NAMES[code] ?? code.toUpperCase();

/**
 * URL convention: the default locale lives at "/", other enabled locales are
 * prefixed ("/fr/about"). Splits an incoming path into locale + page path.
 */
export function splitLocaleFromPath(segments: string[], site: SitePayload): { locale: string; path: string } {
  const locales = site.website.locales ?? [];

  if (segments.length > 0 && segments[0] !== site.website.default_locale && locales.includes(segments[0])) {
    return { locale: segments[0], path: segments.slice(1).join("/") };
  }

  return { locale: "", path: segments.join("/") };
}

export function localizedHref(locale: string, path: string, defaultLocale: string): string {
  const suffix = path ? `/${path}` : "";
  return locale && locale !== defaultLocale ? `/${locale}${suffix}` : suffix || "/";
}
