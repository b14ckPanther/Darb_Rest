import React from "react";
import Link from "next/link";
import { type SupportedLocale, isValidLocale, DEFAULT_LOCALE } from "@darb-rest/i18n";
import { Header } from "../../../components/header";
import { Footer } from "../../../components/footer";
import { IconCheck, IconMail, IconSparkles } from "@darb-rest/icons";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;

  const content = {
    ar: {
      badge: "شروط الخدمة",
      title: "إطار استخدام منصة درب ريست للمطاعم",
      lastUpdated: "آخر تحديث: سبتمبر 2026",
      intro:
        "تحدد هذه الشروط المبادئ العامة لاستخدام منصة درب ريست الرقمية لإنشاء قوائم الطعام وإدارة الفروع وتوفير تجربة رقمية راقية للمطاعم والمقاهي.",
      sections: [
        {
          title: "الوصول والحسابات التجارية",
          desc: "يتحمل صاحب النشاط التجاري مسؤولية دقة بيانات الدخول وصلاحيات الفريق الممنوحة لمديري الفروع وموظفي الخدمة عبر لوحة التحكم.",
        },
        {
          title: "محتوى القوائم وحقوق الملكية",
          desc: "يحتفظ المطعم بكامل حقوق الملكية الفكرية لشعاره وصور أطباقه وأوصاف المنيو المنشورة عبر المنصة، مع ضمان عدم انتهاك حقوق الغير.",
        },
        {
          title: "جاهزية واستقرار الخدمة",
          desc: "نعمل باستمرار على توفير أعلى درجات التوفر والاستقرار الرقمي لأنظمة المنيو والخدمات السحابية لضمان استمرارية خدمة الزبائن دون انقطاع.",
        },
        {
          title: "الدعم الفني والتحديثات",
          desc: "نقدم تحديثات مستمرة لتحسين الأداء والأمان وتطوير الميزات بما يخدم مصلحة المطاعم والمقاهي الشريكة.",
        },
      ],
      noticeTitle: "وثيقة الاتفاقية التجارية الرسمية",
      noticeText: "للاستفسار عن الباقات أو الشروط، يرجى التواصل مع فريقنا.",
      contactCta: "تواصل مع الإدارة القانونية",
    },
    he: {
      badge: "תנאי שימוש",
      title: "תנאי השימוש בפלטפורמת דרב רסט למסעדות",
      lastUpdated: "עדכון אחרון: ספטמבר 2026",
      intro:
        "תנאים אלו מגדירים את מסגרת הפעילות בפלטפורמת דרב רסט להקמת תפריטים דיגיטליים, ניהול סניפים ויצירת חוויית אירוח דיגיטלית מתקדמת.",
      sections: [
        {
          title: "גישה וחשבונות עסקיים",
          desc: "בעל העסק אחראי לאבטחת פרטי הגישה ולהגדרת הרשאות הגישה של מנהלי הסניפים ואנשי הצוות במערכת.",
        },
        {
          title: "תוכן התפריט וקניין רוחני",
          desc: "המסעדה שומרת על מלוא זכויות היוצרים בלוגו, בתמונות ובתוכן התפריט המועלה לפלטפורמה.",
        },
        {
          title: "זמינות ויציבות המערכת",
          desc: "אנו משקיעים משאבים מתמידים בהבטחת זמינות גבוהה ויציבות מרבית של מערכות התפריט והתשתיות בענן.",
        },
        {
          title: "תמיכה שוטפת ושדרוגים",
          desc: "אנו מספקים עדכוני אבטחה, שיפורי ביצועים ותכונות חדשות באופן רציף לטובת לקוחותינו.",
        },
      ],
      noticeTitle: "מסמך תנאי ההתקשרות הרשמי",
      noticeText: "לשאלות על התוכניות או התנאים, צרו קשר עם הצוות שלנו.",
      contactCta: "פנה למחלקה המשפטית",
    },
    en: {
      badge: "Terms of Service",
      title: "Operating terms for Darb REST restaurant platform",
      lastUpdated: "Last updated: September 2026",
      intro:
        "These terms outline the principles and operational guidelines governing your restaurant's use of the Darb REST platform, digital menus, and location management tools.",
      sections: [
        {
          title: "Account Governance & Roles",
          desc: "Business owners are responsible for safeguarding login credentials and assigning appropriate administrative and staff access roles within the console.",
        },
        {
          title: "Catalog Content & IP Rights",
          desc: "All restaurant branding, photos, dish descriptions, and trademarks remain the exclusive intellectual property of the restaurant operator.",
        },
        {
          title: "Service Reliability & Uptime",
          desc: "We engineer our infrastructure for high availability and low-latency menu rendering to ensure your guests always experience swift service.",
        },
        {
          title: "Platform Maintenance & Upgrades",
          desc: "We continuously deploy performance improvements, localized enhancements, and security patches without disrupting daily restaurant service.",
        },
      ],
      noticeTitle: "Commercial Services Agreement Notice",
      noticeText: "For questions about our plans or terms, please contact our team.",
      contactCta: "Contact Legal & Operations",
    },
  }[currentLocale];

  return (
    <>
      <Header />
      <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-12">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 mb-4">
            {content.badge}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--charcoal)] text-balance">
            {content.title}
          </h1>
          <p className="mt-2 text-xs text-[var(--warm-stone)]">{content.lastUpdated}</p>
          <p className="mt-6 text-base text-[var(--fg-default)] leading-relaxed">{content.intro}</p>
        </div>

        <div className="space-y-6 mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.sections.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <IconCheck size={16} className="text-[var(--color-primary)] shrink-0" />
                  <h2 className="text-sm font-bold text-[var(--charcoal)]">{item.title}</h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--warm-stone)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <IconSparkles size={20} className="text-[var(--color-primary)]" />
            <h3 className="text-base font-bold text-[var(--charcoal)]">{content.noticeTitle}</h3>
          </div>
          <p className="text-xs sm:text-sm text-[var(--warm-stone)] leading-relaxed mb-6">
            {content.noticeText}
          </p>
          <Link
            href={`/${currentLocale}/contact`}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline"
          >
            <IconMail size={16} />
            <span>{content.contactCta}</span>
          </Link>
        </div>
      </main>
      <Footer locale={currentLocale} />
    </>
  );
}
