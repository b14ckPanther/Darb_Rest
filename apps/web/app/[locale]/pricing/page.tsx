import React from "react";
import { type SupportedLocale, isValidLocale, DEFAULT_LOCALE } from "@darb-rest/i18n";
import { Header } from "../../../components/header";
import { Footer } from "../../../components/footer";
import { adminUrl } from "../../../components/admin-url";
import { IconCheck, IconSparkles, IconStore, IconBuilding } from "@darb-rest/icons";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;

  const content = {
    ar: {
      badge: "الباقات والأسعار",
      title: "خطط مرنة تناسب طموح مطعمك",
      subtitle: "ابدأ بمنيو رقمي أنيق وتوسع بكل سهولة مع نمو فروعك وزبائنك — دون تعقيد.",
      popularBadge: "الأكثر طلباً",
      contactSales: "تواصل مع المبيعات",
      getStarted: "ابدأ الآن",
      plans: [
        {
          name: "الأساسية",
          code: "starter",
          desc: "مثالية للمقاهي الصغيرة ومنافذ الخدمة السريعة التي تريد منيو رقمي سريع وأنيق.",
          icon: IconStore,
          features: [
            "منيو رقمي احترافي متعدد اللغات",
            "رموز QR عالية الدقة للطاولات والواجهة",
            "إدارة فرع واحد وتفاصيل العمل",
            "تحديث فوري للأسعار والأطباق",
            "عرض متوافق وسريع على الهواتف",
          ],
        },
        {
          name: "الاحترافية",
          code: "pro",
          desc: "للمطاعم والمقاهي المتنامية الراغبة بهوية خاصة ودعم فروع متعددة وتجربة طلب متطورة.",
          icon: IconSparkles,
          popular: true,
          features: [
            "كل ما تقدمه الباقة الأساسية",
            "إدارة حتى 3 فروع مستقلة",
            "ألوان مخصصة وشعار النشاط",
            "جدولة دقيقة لساعات العمل لكل فرع",
            "جاهزية لاستقبال الطلبات الرقمية",
          ],
        },
        {
          name: "المؤسسات",
          code: "enterprise",
          desc: "لسلاسل المطاعم ومجموعات الضيافة التي تحتاج مرونة شاملة وتخصيصاً غير محدود.",
          icon: IconBuilding,
          features: [
            "كل ما تقدمه الباقة الاحترافية",
            "إدارة حتى 25 فرعاً تحت حساب موحد",
            "نطاق مخصص وهوية متقدمة",
            "دعم فني مخصص وأولوية الاستجابة",
            "جلسة إعداد ومساعدة في تدريب الفريق",
          ],
        },
      ],
      faqTitle: "الأسئلة الشائعة",
      faqs: [
        {
          q: "هل يمكنني تجربة المنصة قبل الالتزام؟",
          a: "نعم، يمكنك البدء فوراً وتجهيز المنيو الخاص بك وتجربته بالكامل على هاتفك قبل نشره للزبائن.",
        },
        {
          q: "هل أحتاج إلى خبرة تقنية لإدارة المنيو؟",
          a: "إطلاقاً. صُممت لوحة التحكم لتكون بسيطة ومباشرة لأصحاب المطاعم ومديري الصالات دون أي تعقيد تقني.",
        },
        {
          q: "كيف تعمل إدارة الفروع المتعددة؟",
          a: "يمكنك إدارة جميع فروعك من حساب واحد، مع تحديد ساعات عمل وعناوين مستقلة لكل فرع بكل سهولة.",
        },
      ],
    },
    he: {
      badge: "תוכניות ומחירים",
      title: "תוכניות גמישות שמתאימות למסעדה שלך",
      subtitle: "התחל עם תפריט דיגיטלי מעוצב והתרחב בקלות ככל שהעסק והסניפים צומחים.",
      popularBadge: "הכי פופולרי",
      contactSales: "צור קשר",
      getStarted: "התחל עכשיו",
      plans: [
        {
          name: "בסיסית",
          code: "starter",
          desc: "אידיאלי לבתי קפה קטנים, עגלות קפה ודוכנים שרוצים תפריט דיגיטלי מהיר ואסתטי.",
          icon: IconStore,
          features: [
            "תפריט דיגיטלי רב-לשוני מעוצב",
            "קודי QR ברזולוציה גבוהה לשולחנות",
            "ניהול סניף יחיד ושעות פעילות",
            "עדכון מיידי של מנות ומחירים",
            "חוויית משתמש מהירה וקלה בנייד",
          ],
        },
        {
          name: "מקצועית",
          code: "pro",
          desc: "למסעדות ובתי קפה בצמיחה שרוצים זהות מותג ייחודית ותמיכה במספר סניפים.",
          icon: IconSparkles,
          popular: true,
          features: [
            "כל מה שכלול בתוכנית הבסיסית",
            "ניהול של עד 3 סניפים נפרדים",
            "התאמת צבעי מותג ולוגו אישי",
            "שעות פעילות ייעודיות לכל סניף",
            "מוכנות לקבלת הזמנות דיגיטליות",
          ],
        },
        {
          name: "ארגונית",
          code: "enterprise",
          desc: "לרשתות מסעדות וקבוצות אירוח הזקוקות לניהול מתקדם ומענה מותאם אישית.",
          icon: IconBuilding,
          features: [
            "כל מה שכלול בתוכנית המקצועית",
            "ניהול עד 25 סניפים תחת חשבון אחד",
            "דומיין מותאם אישית ומיתוג מלא",
            "תמיכה ייעודית ומענה בעדיפות גבוהה",
            "סיוע אישי בהטמעה ובהדרכת הצוות",
          ],
        },
      ],
      faqTitle: "שאלות נפוצות",
      faqs: [
        {
          q: "האם ניתן לנסות את המערכת לפני התחייבות?",
          a: "כן, ניתן להירשם, להקים את התפריט ולבדוק אותו ישירות בנייד לפני ההשקה לאורחים.",
        },
        {
          q: "האם דרוש ידע טכני לניהול התפריט?",
          a: "ממש לא. לוח הבקרה פותח במיוחד עבור בעלי מסעדות ומנהלים — הוא פשוט, ברור ואינטואיטיבי.",
        },
        {
          q: "איך עובד ניהול של מספר סניפים?",
          a: "כל הסניפים מנוהלים מחשבון יחיד, כאשר לכל סניף שעות פעילות, כתובת ופרטי קשר עצמאיים.",
        },
      ],
    },
    en: {
      badge: "Plans & Pricing",
      title: "Flexible plans built for your restaurant",
      subtitle:
        "Start with an elegant digital menu and grow seamlessly as your locations and guests multiply.",
      popularBadge: "Most Popular",
      contactSales: "Contact Sales",
      getStarted: "Get Started",
      plans: [
        {
          name: "Starter",
          code: "starter",
          desc: "Ideal for independent cafés, food trucks, and bistros wanting a crisp, modern digital menu.",
          icon: IconStore,
          features: [
            "Polished multilingual digital menu",
            "High-resolution table & counter QR codes",
            "Single branch management & hours",
            "Instant dish & price updates",
            "Fast, app-like mobile guest experience",
          ],
        },
        {
          name: "Pro",
          code: "pro",
          desc: "For growing restaurants and culinary teams that want distinct brand identity and multiple locations.",
          icon: IconSparkles,
          popular: true,
          features: [
            "Everything in Starter",
            "Up to 3 distinct branch locations",
            "Custom brand colors & restaurant logo",
            "Independent operating hours per branch",
            "Online ordering readiness",
          ],
        },
        {
          name: "Enterprise",
          code: "enterprise",
          desc: "For restaurant groups and multi-unit brands needing bespoke customization and dedicated support.",
          icon: IconBuilding,
          features: [
            "Everything in Pro",
            "Up to 25 branch locations unified",
            "Custom domain & full brand styling",
            "Dedicated account manager & priority response",
            "Guided team onboarding & menu migration",
          ],
        },
      ],
      faqTitle: "Frequently Asked Questions",
      faqs: [
        {
          q: "Can I test the platform before going live?",
          a: "Yes. You can configure your dishes, brand, and branches in the console and test the guest experience immediately on your phone.",
        },
        {
          q: "Do I need technical knowledge to manage menus?",
          a: "Not at all. The business console is designed specifically for restaurant operators with an intuitive, zero-code interface.",
        },
        {
          q: "How does multi-location management work?",
          a: "All branches live under your unified business account. Each branch has its own hours, contact details, and address.",
        },
      ],
    },
  }[currentLocale];

  return (
    <>
      <Header />
      <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Page Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 mb-4">
            {content.badge}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--charcoal)] text-balance">
            {content.title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[var(--warm-stone)] text-balance">
            {content.subtitle}
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-24">
          {content.plans.map((plan) => {
            const Icon = plan.icon;
            const isPopular = Boolean(plan.popular);

            return (
              <div
                key={plan.code}
                className={`relative flex flex-col justify-between rounded-2xl p-6 sm:p-8 transition-all duration-200 ${
                  isPopular
                    ? "bg-[var(--bg-surface)] border-2 border-[var(--color-primary)] shadow-xl lg:-translate-y-2"
                    : "bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm hover:shadow-md"
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3.5 start-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm">
                    {content.popularBadge}
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <Icon size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--charcoal)]">{plan.name}</h2>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--warm-stone)] leading-relaxed mb-6">
                    {plan.desc}
                  </p>

                  <div className="border-t border-[var(--border-subtle)] my-6" />

                  <ul className="space-y-3 text-xs sm:text-sm text-[var(--fg-default)] mb-8">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5">
                        <IconCheck
                          size={16}
                          className="text-[var(--color-primary)] shrink-0 mt-0.5"
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <a
                    href={adminUrl}
                    className={`inline-flex w-full items-center justify-center rounded-xl min-h-[44px] px-5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
                      isPopular
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)] shadow-sm"
                        : "border border-[var(--border-default)] bg-transparent text-[var(--fg-default)] hover:bg-[var(--bg-surface-elevated)]"
                    }`}
                  >
                    {content.getStarted}
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[var(--charcoal)] mb-8">
            {content.faqTitle}
          </h2>
          <div className="space-y-4">
            {content.faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
              >
                <h3 className="text-sm sm:text-base font-semibold text-[var(--charcoal)] mb-2">
                  {faq.q}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--warm-stone)] leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer locale={currentLocale} />
    </>
  );
}
