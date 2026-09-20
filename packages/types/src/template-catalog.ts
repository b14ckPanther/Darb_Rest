import type { ContentName } from "./content";
import type { AppearanceSettings, TemplateMetadata } from "./templates";
const define = (
  id: string,
  name: ContentName,
  description: ContentName,
  tags: string[],
  densities: TemplateMetadata["densities"] = ["airy", "balanced", "compact"],
): TemplateMetadata => ({
  id,
  name,
  description,
  tags,
  version: 1,
  densities,
  layoutControls:
    id === "minimal"
      ? ["navigation", "cards", "information", "cta", "footer", "surface"]
      : ["hero", "focal", "navigation", "cards", "information", "cta", "footer", "surface"],
  supportsImages: true,
  supportsCover: id !== "minimal",
  supportsVideo: true,
  previewImage: `/template-previews/${id}.svg`,
  premium: false,
  recommendedBusinessTypes: tags.includes("cafe") ? ["cafe", "bakery"] : ["restaurant"],
});
/** Add definitions here. No maximum, database enum or ordering-engine changes are required. */
export const TEMPLATE_CATALOG: readonly TemplateMetadata[] = [
  define(
    "signature",
    { en: "Signature", ar: "التوقيع", he: "חתימה" },
    {
      en: "Cinematic cover, floating identity and a generous dining menu.",
      ar: "غلاف سينمائي وهوية بارزة وقائمة طعام رحبة.",
      he: "תמונת פתיחה רחבה, זהות בולטת ותפריט מרווח.",
    },
    ["dining", "elegant"],
  ),
  define(
    "editorial",
    { en: "Editorial", ar: "المجلة", he: "מגזין" },
    {
      en: "Oversized masthead, numbered sections and an editorial grid.",
      ar: "عنوان كبير وأقسام مرقمة وتنسيق تحريري.",
      he: "כותרת גדולה, פרקים ממוספרים ופריסה מגזינית.",
    },
    ["dining", "expressive"],
  ),
  define(
    "minimal",
    { en: "Essential", ar: "الجوهر", he: "מהות" },
    {
      en: "Quiet typography, vertical categories and precise menu rows.",
      ar: "خطوط هادئة وفئات جانبية وصفوف واضحة.",
      he: "טיפוגרפיה נקייה, קטגוריות צד ושורות מדויקות.",
    },
    ["clean", "compact"],
    ["balanced", "compact"],
  ),
  define(
    "cafe",
    { en: "Coffee House", ar: "بيت القهوة", he: "בית קפה" },
    {
      en: "Portrait cover, rounded imagery and a relaxed café rhythm.",
      ar: "غلاف طولي وصور دائرية وإيقاع مقهى هادئ.",
      he: "פתיחה אנכית, תמונות עגולות וקצב נינוח.",
    },
    ["cafe", "warm"],
  ),
  define(
    "quick",
    { en: "Quick Counter", ar: "الكاونتر", he: "דלפק" },
    {
      en: "Compact branch header and fast-scanning, sticky categories.",
      ar: "رأس مدمج وفئات ثابتة لتصفح سريع.",
      he: "פתיחה קומפקטית וקטגוריות קבועות לסריקה מהירה.",
    },
    ["compact", "clean"],
    ["compact", "balanced"],
  ),
  define(
    "bold",
    { en: "Bold Table", ar: "المائدة الجريئة", he: "שולחן נועז" },
    {
      en: "Graphic cover, oversized dishes and punchy category tiles.",
      ar: "غلاف جريء وأطباق كبيرة وفئات بارزة.",
      he: "פתיחה גרפית, מנות גדולות ואריחי קטגוריות.",
    },
    ["expressive", "dining"],
  ),
  define(
    "night",
    { en: "After Dark", ar: "بعد الغروب", he: "אחרי השקיעה" },
    {
      en: "Matte charcoal, panoramic imagery and intimate menu spacing.",
      ar: "فحمي مطفي وصور بانورامية ومساحات حميمة.",
      he: "פחם מט, תמונות פנורמיות ופריסה אינטימית.",
    },
    ["elegant", "dining"],
    ["airy", "balanced"],
  ),
  define(
    "bakery",
    { en: "Bake & Gather", ar: "خبز ولَمّة", he: "מאפה ומפגש" },
    {
      en: "A welcoming banner with a visual, market-style catalog.",
      ar: "غلاف ترحيبي وكتالوج بصري بطابع السوق.",
      he: "פתיחה מזמינה וקטלוג חזותי בסגנון שוק.",
    },
    ["cafe", "warm"],
  ),
];

export function templateDefinition(id: string) {
  return TEMPLATE_CATALOG.find((t) => t.id === id);
}
export function supportedAppearance(settings: AppearanceSettings) {
  const template = templateDefinition(settings.template);
  return (
    !!template &&
    settings.version === template.version &&
    template.densities.includes(settings.density)
  );
}
