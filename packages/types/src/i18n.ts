import type { SupportedLocale } from "@darb-rest/config";
export type { SupportedLocale };

export type Direction = "rtl" | "ltr";

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: Direction;
  fontFamily: string;
  fontVariable: string;
}

export type LocalizedString = Record<SupportedLocale, string>;
