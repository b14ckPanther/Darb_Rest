import React from "react";
import { getOnboardingDraft } from "../../../../lib/actions/onboarding";
import { OnboardingWizard, type PlanItem } from "../../../../components/onboarding-wizard";
import {
  isValidLocale,
  DEFAULT_LOCALE,
  type SupportedLocale,
  getDictionary,
} from "@darb-rest/i18n";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;
  const dict = getDictionary(currentLocale);

  // 1. Retrieve draft if present
  const initialDraft = await getOnboardingDraft();

  // 2. Localized fallback plans
  const availablePlans: PlanItem[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      code: "starter",
      name: {
        ar: "الباقة الأساسية",
        he: "תוכנית בסיסית",
        en: "Starter Plan",
      },
      description: {
        ar: "مثالية للمقاهي الصغيرة ومنافذ الخدمة السريعة",
        he: "אידיאלי לבתי קפה קטנים, עגלות קפה ודוכנים",
        en: "Ideal for small cafés, food trucks, and bistros",
      },
      features: {
        ar: [
          "منيو رقمي متعدد اللغات",
          "رموز QR عالية الدقة للطاولات",
          "إدارة فرع واحد وتفاصيل العمل",
          "تحديث فوري للأطباق والأسعار",
        ],
        he: [
          "תפריט דיגיטלי רב-לשוני מעוצב",
          "קודי QR ברזולוציה גבוהה לשולחנות",
          "ניהול סניף יחיד ושעות פעילות",
          "עדכון מיידי של מנות ומחירים",
        ],
        en: [
          "Multilingual digital menu",
          "High-res QR codes for tables",
          "Single location & hours management",
          "Instant dish & price updates",
        ],
      },
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      code: "pro",
      name: {
        ar: "الباقة الاحترافية",
        he: "תוכנית מקצועית",
        en: "Pro Plan",
      },
      description: {
        ar: "للمطاعم والمقاهي المتنامية مع فروع متعددة",
        he: "למסעדות ובתי קפה בצמיחה עם מספר סניפים",
        en: "For growing restaurants & cafés with multiple branches",
      },
      features: {
        ar: [
          "كل مزايا الباقة الأساسية",
          "إدارة حتى 3 فروع مستقلة",
          "تخصيص كامل لألوان وشعار المطعم",
          "جاهزية استقبال الطلبات الرقمية",
        ],
        he: [
          "כל מה שכלול בתוכנית הבסיסית",
          "ניהול של עד 3 סניפים נפרדים",
          "התאמה מלאה של צבעי מותג ולוגו",
          "מוכנות לקבלת הזמנות דיגיטליות",
        ],
        en: [
          "Everything in Starter",
          "Up to 3 distinct branch locations",
          "Full custom colors & restaurant branding",
          "Online ordering readiness",
        ],
      },
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      code: "enterprise",
      name: {
        ar: "باقة المؤسسات",
        he: "תוכנית ארגונית",
        en: "Enterprise Plan",
      },
      description: {
        ar: "لسلاسل المطاعم ومجموعات الضيافة الكبرى",
        he: "לרשתות מסעדות וקבוצות אירוח גדולות",
        en: "For culinary chains and hospitality groups",
      },
      features: {
        ar: [
          "كل مزايا الباقة الاحترافية",
          "إدارة حتى 25 فرعاً موحداً",
          "نطاق مخصص وهوية متقدمة",
          "دعم فني مخصص وأولوية الاستجابة",
        ],
        he: [
          "כל מה שכלול בתוכנית המקצועית",
          "ניהול עד 25 סניפים תחת חשבון אחד",
          "דומיין מותאם אישית ומיתוג מלא",
          "תמיכה ייעודית בעדיפות גבוהה",
        ],
        en: [
          "Everything in Pro",
          "Up to 25 branch locations unified",
          "Custom domain & advanced branding",
          "Dedicated priority account support",
        ],
      },
    },
  ];

  return (
    <div className="py-4 max-w-4xl mx-auto">
      <div className="mb-6 text-center sm:text-start">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fg-default)]">
          {dict.onboarding.pageTitle}
        </h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1.5">{dict.onboarding.pageSubtitle}</p>
      </div>

      <OnboardingWizard
        initialDraft={initialDraft}
        availablePlans={availablePlans}
        userLocale={currentLocale}
      />
    </div>
  );
}
