"use client";

import React, { useState } from "react";
import type { SupportedLocale } from "@darb-rest/i18n";
import { IconCheck } from "@darb-rest/icons";

export interface ContactFormProps {
  locale: SupportedLocale;
  labels: {
    formTitle: string;
    formSubtitle: string;
    nameLabel: string;
    restaurantLabel: string;
    emailLabel: string;
    phoneLabel: string;
    messageLabel: string;
    sendButton: string;
  };
}

export function ContactForm({ locale, labels }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 sm:p-12 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] mx-auto mb-4">
          <IconCheck size={24} />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-[var(--charcoal)] mb-2">
          {locale === "ar"
            ? "شكراً لتواصلك معنا!"
            : locale === "he"
              ? "תודה על פנייתך!"
              : "Thank you for reaching out!"}
        </h3>
        <p className="text-xs sm:text-sm text-[var(--warm-stone)] max-w-md mx-auto">
          {locale === "ar"
            ? "تم استلام استفسارك بنجاح، وسيتواصل معك مستشارنا خلال يوم عمل واحد."
            : locale === "he"
              ? "פנייתך התקבלה בהצלחה, ונציג מטעמנו יחזור אליך בתוך יום עסקים אחד."
              : "We have received your message and an advisor will be in touch within one business day."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-sm">
      <h2 className="text-xl font-bold text-[var(--charcoal)] mb-1">{labels.formTitle}</h2>
      <p className="text-xs sm:text-sm text-[var(--warm-stone)] mb-6">{labels.formSubtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg-default)]">
              {labels.nameLabel} *
            </label>
            <input
              type="text"
              required
              placeholder={
                locale === "ar"
                  ? "مثال: سامي أحمد"
                  : locale === "he"
                    ? "לדוגמה: יונתן כהן"
                    : "e.g. John Doe"
              }
              className="w-full h-11 px-3.5 text-sm bg-[var(--bg-surface)] text-[var(--fg-default)] rounded-xl border border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg-default)]">
              {labels.restaurantLabel} *
            </label>
            <input
              type="text"
              required
              placeholder={
                locale === "ar"
                  ? "مثال: مقهى الياسمين"
                  : locale === "he"
                    ? "לדוגמה: קפה היסמין"
                    : "e.g. Jasmine Café"
              }
              className="w-full h-11 px-3.5 text-sm bg-[var(--bg-surface)] text-[var(--fg-default)] rounded-xl border border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg-default)]">
              {labels.emailLabel} *
            </label>
            <input
              type="email"
              required
              dir="ltr"
              placeholder="name@restaurant.com"
              className="w-full h-11 px-3.5 text-sm bg-[var(--bg-surface)] text-[var(--fg-default)] rounded-xl border border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg-default)]">
              {labels.phoneLabel}
            </label>
            <input
              type="tel"
              dir="ltr"
              placeholder="+972 ..."
              className="w-full h-11 px-3.5 text-sm bg-[var(--bg-surface)] text-[var(--fg-default)] rounded-xl border border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--fg-default)]">
            {labels.messageLabel} *
          </label>
          <textarea
            rows={4}
            required
            placeholder={
              locale === "ar"
                ? "اكتب تفاصيل استفسارك هنا..."
                : locale === "he"
                  ? "כתוב את פרטי הפנייה כאן..."
                  : "Tell us about your restaurant and what you are looking for..."
            }
            className="w-full p-3.5 text-sm bg-[var(--bg-surface)] text-[var(--fg-default)] rounded-xl border border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl min-h-[44px] px-6 text-sm font-semibold bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)] transition-all duration-150 active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50"
        >
          {loading ? "..." : labels.sendButton}
        </button>
      </form>
    </div>
  );
}
