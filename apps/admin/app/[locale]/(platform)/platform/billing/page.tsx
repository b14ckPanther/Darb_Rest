import { activationLabels, type SupportedLocale } from "@darb-rest/i18n";
import { localizedJson } from "@darb-rest/supabase/customer-mail";
import { requirePlatform, requireData } from "../../../../../lib/platform";
import { saveBillingSettings } from "../../../../../lib/actions/customer-activation";
export default async function Billing({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { locale } = await params,
    { db } = await requirePlatform(locale),
    L = activationLabels[locale];
  const settings = requireData(
    await db.from("platform_billing_settings").select("*").eq("id", true).single(),
  );
  if (!settings) throw Error("billing_missing");
  const { result } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold">{L.billing}</h1>
      <p>{L.manual}</p>
      {result && <p role="status">{result === "saved" ? L.saved : L.failed}</p>}
      <form
        action={saveBillingSettings}
        className="grid max-w-4xl gap-6 rounded-xl bg-[var(--bg-surface)] p-5 sm:p-8"
      >
        <input type="hidden" name="locale" value={locale} />
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ["sender_name", L.sender],
              ["support_email", L.support],
              ["payment_due_days", L.due],
              ["bit_phone", L.bit],
              ["bank_account_holder", L.holder],
              ["bank_name", L.bankName],
              ["bank_number", L.bankNumber],
              ["bank_branch", L.branch],
              ["bank_account_number", L.bankAccount],
              ["bank_iban", L.iban],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="grid gap-2">
              {label}
              <input
                name={key}
                defaultValue={settings[key] ?? ""}
                type={
                  key === "support_email" ? "email" : key === "payment_due_days" ? "number" : "text"
                }
                min={key === "payment_due_days" ? 1 : undefined}
                max={key === "payment_due_days" ? 365 : undefined}
                className="min-h-12 min-w-0 rounded-lg border bg-transparent px-3"
                dir="auto"
              />
            </label>
          ))}
        </div>
        {(["bit", "bank"] as const).map((method) => (
          <fieldset key={method} className="grid gap-4 border-t pt-5">
            <legend className="font-bold">{method === "bit" ? L.bit : L.bank_transfer}</legend>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                name={`${method}_enabled`}
                defaultChecked={settings[`${method}_enabled`]}
              />
              {L.enabled}
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              {(["en", "ar", "he"] as const).map((lang) => (
                <label key={lang} className="grid gap-2">
                  {L.instructionText} ({lang})
                  <textarea
                    name={`${method}_${lang}`}
                    lang={lang}
                    dir={lang === "en" ? "ltr" : "rtl"}
                    maxLength={2000}
                    rows={4}
                    defaultValue={localizedJson(settings[`${method}_instructions`], lang)}
                    className="min-w-0 rounded-lg border bg-transparent p-3"
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button className="min-h-12 rounded-lg bg-[var(--darb-green-deep)] px-6 text-white">
          {L.save}
        </button>
      </form>
    </>
  );
}
