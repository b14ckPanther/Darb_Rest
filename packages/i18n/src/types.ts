import type { en, TranslationDictionary } from "./dictionaries/en";

export type { TranslationDictionary };

type Prev = [never, 0, 1, 2, 3, ...0[]];

export type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${"" extends P ? "" : "."}${P}`
    : never
  : never;

export type NestedKeyOf<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]-?: K extends string | number
          ? `${K}` | Join<K, NestedKeyOf<T[K], Prev[D]>>
          : never;
      }[keyof T]
    : "";

export type TranslationKey = NestedKeyOf<typeof en>;
export type TranslationParams = Record<string, string | number>;
export type TranslateFunction = (key: TranslationKey, params?: TranslationParams) => string;
