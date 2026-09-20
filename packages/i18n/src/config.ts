import type { Direction, LocaleConfig } from "@darb-rest/types";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  type SupportedLocale,
} from "@darb-rest/config";

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale };

export const LOCALE_CONFIGS: Record<SupportedLocale, LocaleConfig> = {
  ar: {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    fontFamily: "Cairo",
    fontVariable: "--font-cairo",
  },
  he: {
    code: "he",
    name: "Hebrew",
    nativeName: "עברית",
    direction: "rtl",
    fontFamily: "Heebo",
    fontVariable: "--font-heebo",
  },
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    fontFamily: "Ubuntu",
    fontVariable: "--font-ubuntu",
  },
};

export function getDirection(locale: string): Direction {
  return (RTL_LOCALES as readonly string[]).includes(locale) ? "rtl" : "ltr";
}

export function isRtl(locale: string): boolean {
  return getDirection(locale) === "rtl";
}

export function isValidLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}
