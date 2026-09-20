import { DEFAULT_LOCALE, type SupportedLocale } from "@darb-rest/config";
import { ar } from "./dictionaries/ar";
import { en, type TranslationDictionary } from "./dictionaries/en";
import { he } from "./dictionaries/he";
import type { TranslateFunction, TranslationKey, TranslationParams } from "./types";

export const dictionaries: Record<SupportedLocale, TranslationDictionary> = {
  ar,
  he,
  en,
};

export function getDictionary(locale: string): TranslationDictionary {
  if (locale in dictionaries) {
    return dictionaries[locale as SupportedLocale];
  }
  return dictionaries[DEFAULT_LOCALE];
}

function resolveNestedKey(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function translate(locale: string, key: TranslationKey, params?: TranslationParams): string {
  const dict = getDictionary(locale);
  let value = resolveNestedKey(dict as unknown as Record<string, unknown>, key);

  if (!value && locale !== DEFAULT_LOCALE) {
    // Fallback to default locale (Arabic) or English
    const fallbackDict = dictionaries[DEFAULT_LOCALE];
    value = resolveNestedKey(fallbackDict as unknown as Record<string, unknown>, key);
  }

  if (!value) {
    return key;
  }

  if (params) {
    return Object.entries(params).reduce<string>((acc, [pKey, pVal]) => {
      return acc.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
    }, value);
  }

  return value;
}

export function createTranslator(locale: string): TranslateFunction {
  return (key: TranslationKey, params?: TranslationParams) => translate(locale, key, params);
}
