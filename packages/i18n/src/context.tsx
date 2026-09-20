"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Direction, LocaleConfig } from "@darb-rest/types";
import { LOCALE_CONFIGS, getDirection, type SupportedLocale, DEFAULT_LOCALE } from "./config";
import { createTranslator } from "./translate";
import type { TranslateFunction, TranslationKey, TranslationParams } from "./types";

export interface I18nContextValue {
  locale: SupportedLocale;
  direction: Direction;
  isRtl: boolean;
  config: LocaleConfig;
  t: TranslateFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  locale: SupportedLocale;
  children: React.ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(() => {
    const validLocale = (locale in LOCALE_CONFIGS ? locale : DEFAULT_LOCALE) as SupportedLocale;
    const direction = getDirection(validLocale);
    const config = LOCALE_CONFIGS[validLocale];
    const t = createTranslator(validLocale);

    return {
      locale: validLocale,
      direction,
      isRtl: direction === "rtl",
      config,
      t,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback for non-provider renders
    const direction = getDirection(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      direction,
      isRtl: direction === "rtl",
      config: LOCALE_CONFIGS[DEFAULT_LOCALE],
      t: (key: TranslationKey, params?: TranslationParams) => translateFallback(key, params),
    };
  }
  return context;
}

function translateFallback(key: TranslationKey, params?: TranslationParams): string {
  const fallback = createTranslator(DEFAULT_LOCALE);
  return fallback(key, params);
}
