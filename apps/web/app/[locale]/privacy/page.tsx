import React from "react";
import Link from "next/link";
import { type SupportedLocale, isValidLocale, DEFAULT_LOCALE } from "@darb-rest/i18n";
import { Header } from "../../../components/header";
import { Footer } from "../../../components/footer";
import { IconLock, IconCheck, IconMail } from "@darb-rest/icons";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;

  const content = {
    ar: {
      badge: "الخصوصية وحماية البيانات",
      title: "التزامنا بحماية خصوصية مطعمك وزبائنك",
      lastUpdated: "آخر تحديث: سبتمبر 2026",
      intro:
        "في درب ريست، نؤمن بأن بيانات مطعمك وقوائمك وزبائنك ملك لك وحدك. نحن ملتزمون بأعلى معايير الشفافية والأمان في معالجة وتخزين البيانات.",
      principlesTitle: "مبادئنا الأساسية في حماية البيانات",
      principles: [
        {
          title: "ملكية البيانات",
          desc: "جميع بيانات المنيو، الأطباق، الأسعار والصور تظل ملكاً لمطعمك، ولا يتم بيعها أو مشاركتها مع أي طرف ثالث لأغراض إعلانية.",
        },
        {
          title: "التشفير والأمان",
          desc: "يتم تشفير جميع الاتصالات والبيانات المخزنة عبر بروتوكولات الأمان القياسية في قطاع التكنولوجيا والخدمات السحابية.",
        },
        {
          title: "الحد الأدنى من جمع البيانات",
          desc: "لا نجمع سوى البيانات الضرورية جداً لتشغيل خدمات المنيو الرقمي وإدارة الفروع بكفاءة.",
        },
        {
          title: "حقوق الحذف والتصدير",
          desc: "يحق لأي نشاط تجاري طلب تصدير بياناته بالكامل أو حذف حسابه وبياناته في أي وقت.",
        },
      ],
      noticeTitle: "وثيقة السياسة الرسمية قيد التحديث",
      noticeText:
        "تخضع سياسة الخصوصية للمراجعة القانونية الدورية لمواكبة أحدث اللوائح والأنظمة. للحصول على أحدث نسخة أو لأي استفسار يتعلق بالخصوصية، يرجى التواصل مع فريق الامتثال لدينا.",
      contactCta: "تواصل مع فريق الخصوصية",
    },
    he: {
      badge: "פרטיות ואבטחת מידע",
      title: "המחויבות שלנו לשמירה על פרטיות העסק והאורחים",
      lastUpdated: "עדכון אחרון: ספטמבר 2026",
      intro:
        "בדרב רסט אנו מאמינים כי הנתונים של המסעדה, התפריטים והאורחים שלך שייכים אך ורק לך. אנו פועלים בשקיפות מלאה ומיישמים תקני אבטחה מחמירים.",
      principlesTitle: "עקרונות המפתח שלנו בניהול מידע",
      principles: [
        {
          title: "בעלות מלאה על המידע",
          desc: "כל המידע אודות התפריטים, המנות, המחירים והתמונות נשאר בבעלותך הבלעדית ואינו מועבר לצדדים שלישיים לצרכי פרסום.",
        },
        {
          title: "הצפנה ואבטחה מתקדמת",
          desc: "כל התקשורת והמידע במערכת מוצפנים בהתאם לסטנדרטים המובילים בתעשיית הענן והסייבר.",
        },
        {
          title: "איסוף מידע מינימלי והכרחי בלבד",
          desc: "אנו אוספים אך ורק את המידע הנדרש לתפעול שוטף, יציב ומהיר של התפריט הדיגיטלי והסניפים.",
        },
        {
          title: "זכות למחיקה ולייצוא",
          desc: "כל בית עסק רשאי לבקש ייצוא של נתוניו או מחיקה מלאה של חשבונו בכל עת.",
        },
      ],
      noticeTitle: "מסמך המדיניות הרשמי מתעדכן באופן שוטף",
      noticeText:
        "מדיניות הפרטיות עוברת ביקורת משפטית תקופתית בהתאם להנחיות הרגולציה המעודכנות. לפרטים נוספים או לשאלות בנושא פרטיות ואבטחה, ניתן לפנות לצוות האבטחה שלנו.",
      contactCta: "פנה לממונה פרטיות",
    },
    en: {
      badge: "Privacy & Data Protection",
      title: "Our commitment to safeguarding your restaurant data",
      lastUpdated: "Last updated: September 2026",
      intro:
        "At Darb REST, we believe your menu, pricing, brand assets, and guest interactions belong entirely to you. We maintain strict standards of data integrity, confidentiality, and cloud security.",
      principlesTitle: "Our Core Privacy Principles",
      principles: [
        {
          title: "Data Ownership",
          desc: "Your restaurant data, branch setups, menus, and images remain your intellectual property and are never shared or sold to advertising brokers.",
        },
        {
          title: "Enterprise-Grade Encryption",
          desc: "All web traffic and database storage utilize standard TLS/SSL encryption and modern cryptographic security controls.",
        },
        {
          title: "Minimal Data Footprint",
          desc: "We only collect data strictly necessary to provide reliable digital menu rendering, ordering workflows, and administrative controls.",
        },
        {
          title: "Data Portability & Deletion",
          desc: "Business owners retain the right to export their catalog data or request full deletion of their organizational tenant at any time.",
        },
      ],
      noticeTitle: "Formal Policy Documentation Notice",
      noticeText:
        "Our privacy terms are reviewed continuously to ensure full compliance with regional privacy frameworks. For current formal documentation or compliance inquiries, please contact our data team.",
      contactCta: "Contact Privacy Team",
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
          <h2 className="text-xl font-bold text-[var(--charcoal)]">{content.principlesTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.principles.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <IconCheck size={16} className="text-[var(--color-primary)] shrink-0" />
                  <h3 className="text-sm font-bold text-[var(--charcoal)]">{item.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-[var(--warm-stone)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Informational Policy Box */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <IconLock size={20} className="text-[var(--color-primary)]" />
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
