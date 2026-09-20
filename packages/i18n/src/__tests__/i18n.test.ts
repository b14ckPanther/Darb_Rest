import { describe, it, expect } from "vitest";
import { getDirection, isRtl, translate, dictionaries } from "../index";

describe("i18n System", () => {
  it("determines correct direction for RTL and LTR languages", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("he")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");

    expect(isRtl("ar")).toBe(true);
    expect(isRtl("he")).toBe(true);
    expect(isRtl("en")).toBe(false);
  });

  it("translates common keys across all three languages", () => {
    expect(translate("ar", "common.save")).toBe("حفظ");
    expect(translate("he", "common.save")).toBe("שמור");
    expect(translate("en", "common.save")).toBe("Save");
  });

  it("interpolates parameters in translation strings", () => {
    const translated = translate("en", "admin.roleIndicator", { role: "Owner" });
    expect(translated).toBe("Role: Owner");

    const translatedAr = translate("ar", "admin.roleIndicator", { role: "مالك" });
    expect(translatedAr).toBe("الدور: مالك");
  });

  function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    let keys: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (val && typeof val === "object") {
        keys = keys.concat(getKeys(val as Record<string, unknown>, fullPath));
      } else {
        keys.push(fullPath);
      }
    }
    return keys;
  }

  it("maintains 100% dictionary parity between Arabic, Hebrew, and English", () => {
    const enKeys = getKeys(dictionaries.en).sort();
    const arKeys = getKeys(dictionaries.ar).sort();
    const heKeys = getKeys(dictionaries.he).sort();

    expect(arKeys).toEqual(enKeys);
    expect(heKeys).toEqual(enKeys);
  });

  it("enforces zero emojis across all dictionaries", () => {
    // Emoji regex pattern covering common emoji Unicode blocks
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

    for (const [locale, dict] of Object.entries(dictionaries)) {
      const allValues: string[] = [];
      function collectStrings(node: Record<string, unknown>) {
        for (const val of Object.values(node)) {
          if (typeof val === "string") {
            allValues.push(val);
          } else if (val && typeof val === "object") {
            collectStrings(val as Record<string, unknown>);
          }
        }
      }
      collectStrings(dict as unknown as Record<string, unknown>);

      for (const str of allValues) {
        expect(
          emojiRegex.test(str),
          `Found forbidden emoji in ${locale} dictionary string: "${str}"`,
        ).toBe(false);
      }
    }
  });
});
