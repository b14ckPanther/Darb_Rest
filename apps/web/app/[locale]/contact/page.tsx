import React from "react";
import { type SupportedLocale, isValidLocale, DEFAULT_LOCALE } from "@darb-rest/i18n";
import { Header } from "../../../components/header";
import { Footer } from "../../../components/footer";
import { ContactForm } from "../../../components/contact-form";
import { IconMail, IconPhone, IconMapPin, IconClock } from "@darb-rest/icons";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;

  const content = {
    ar: {
      badge: "تواصل معنا",
      title: "نحن هنا لمساعدة مطعمك على النجاح",
      subtitle:
        "سواء كنت تريد إطلاق المنيو الرقمي الخاص بك، أو لديك استفسار حول إدارة الفروع، فريقنا جاهز للتواصل معك.",
      emailTitle: "البريد الإلكتروني",
      emailDesc: "للدعم والاستفسارات العامة",
      phoneTitle: "الهاتف وواتساب",
      phoneDesc: "من الأحد إلى الخميس، 9:00 - 18:00",
      officeTitle: "المقر الرئيسي",
      officeDesc: "حيفا — الكرمل، إسرائيل",
      hoursTitle: "ساعات العمل",
      hoursDesc: "الأحد - الخميس: 9:00 ص - 6:00 م",
      formTitle: "أرسل لنا رسالة",
      formSubtitle: "سيتواصل معك أحد مستشارينا خلال يوم عمل واحد.",
      nameLabel: "الاسم الكامل",
      restaurantLabel: "اسم المطعم أو المقهى",
      emailLabel: "البريد الإلكتروني",
      phoneLabel: "رقم الهاتف",
      messageLabel: "كيف يمكننا مساعدتك؟",
      sendButton: "إرسال الرسالة",
      directEmail: "support@darb.co.il",
      directPhone: "+972 4 800 0000",
    },
    he: {
      badge: "יצירת קשר",
      title: "אנחנו כאן כדי לעזור למסעדה שלך להצליח",
      subtitle:
        "בין אם ברצונך להשיק תפריט דיגיטלי או שיש לך שאלות על ניהול סניפים, הצוות שלנו זמין עבורך.",
      emailTitle: "דוא״ל",
      emailDesc: "לתמיכה ולפניות כלליות",
      phoneTitle: "טלפון ווואטסאפ",
      phoneDesc: "ראשון עד חמישי, 9:00 - 18:00",
      officeTitle: "משרדים ראשיים",
      officeDesc: "חיפה — כרמל, ישראל",
      hoursTitle: "שעות פעילות",
      hoursDesc: "ראשון - חמישי: 9:00 - 18:00",
      formTitle: "שלח לנו פנייה",
      formSubtitle: "נציג מטעמנו יחזור אליך בתוך יום עסקים אחד.",
      nameLabel: "שם מלא",
      restaurantLabel: "שם המסעדה או בית הקפה",
      emailLabel: "כתובת דוא״ל",
      phoneLabel: "מספר טלפון",
      messageLabel: "כיצד נוכל לסייע?",
      sendButton: "שלח פנייה",
      directEmail: "support@darb.co.il",
      directPhone: "+972 4 800 0000",
    },
    en: {
      badge: "Get in Touch",
      title: "We are here to support your restaurant",
      subtitle:
        "Whether you are launching your first digital menu or scaling multiple branches, our team is ready to help.",
      emailTitle: "Email",
      emailDesc: "For support and general inquiries",
      phoneTitle: "Phone & WhatsApp",
      phoneDesc: "Sunday to Thursday, 9:00 - 18:00",
      officeTitle: "Headquarters",
      officeDesc: "Haifa — Carmel, Israel",
      hoursTitle: "Operating Hours",
      hoursDesc: "Sunday – Thursday: 9:00 AM – 6:00 PM",
      formTitle: "Send us a message",
      formSubtitle: "One of our restaurant advisors will follow up within one business day.",
      nameLabel: "Full Name",
      restaurantLabel: "Restaurant / Café Name",
      emailLabel: "Email Address",
      phoneLabel: "Phone Number",
      messageLabel: "How can we help you?",
      sendButton: "Send Inquiry",
      directEmail: "support@darb.co.il",
      directPhone: "+972 4 800 0000",
    },
  }[currentLocale];

  return (
    <>
      <Header />
      <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Contact Details Cards */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <IconMail size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--charcoal)]">
                    {content.emailTitle}
                  </h2>
                  <p className="text-xs text-[var(--warm-stone)]">{content.emailDesc}</p>
                </div>
              </div>
              <a
                href={`mailto:${content.directEmail}`}
                className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline"
                dir="ltr"
              >
                {content.directEmail}
              </a>
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <IconPhone size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--charcoal)]">
                    {content.phoneTitle}
                  </h2>
                  <p className="text-xs text-[var(--warm-stone)]">{content.phoneDesc}</p>
                </div>
              </div>
              <a
                href={`tel:${content.directPhone}`}
                className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline"
                dir="ltr"
              >
                {content.directPhone}
              </a>
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <IconMapPin size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--charcoal)]">
                    {content.officeTitle}
                  </h2>
                  <p className="text-xs text-[var(--warm-stone)]">{content.officeDesc}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <IconClock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--charcoal)]">
                    {content.hoursTitle}
                  </h2>
                  <p className="text-xs text-[var(--warm-stone)]">{content.hoursDesc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Inquiry Form Component */}
          <div className="lg:col-span-2">
            <ContactForm locale={currentLocale} labels={content} />
          </div>
        </div>
      </main>
      <Footer locale={currentLocale} />
    </>
  );
}
