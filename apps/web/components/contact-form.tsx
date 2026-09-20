import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import Link from "next/link";
import { AcquisitionForm } from "./acquisition-form";
export function ContactForm({ locale }: { locale: SupportedLocale }) {
  const L = getDictionary(locale).acquisition;
  return (
    <div className="rounded-xl bg-[var(--warm-bone)] p-6 sm:p-8">
      <h2 className="text-2xl font-bold">{L.contactTitle}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">{L.contactIntro}</p>
      <Link
        className="mb-6 inline-flex min-h-11 items-center font-semibold underline"
        href={`/${locale}/get-started`}
      >
        {L.requestAccess}
      </Link>
      <AcquisitionForm locale={locale} kind="inquiry" />
    </div>
  );
}
