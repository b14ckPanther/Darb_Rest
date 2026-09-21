import { InviteSession } from "../../../components/invite-session";
import Link from "next/link";
import { activationLabels, LOCALE_CONFIGS, type SupportedLocale } from "@darb-rest/i18n";
import { accountSession } from "../../../lib/customer-activation";
import { updateAccount } from "../../../lib/actions/account";
import { PasswordFields, AccountSubmit } from "../../../components/account-form";
export const metadata = { robots: { index: false, follow: false } };
export default async function Account({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { locale } = await params,
    { db, user } = await accountSession(locale),
    L = activationLabels[locale];
  const { data: profile, error } = await db
    .from("profiles")
    .select("full_name,phone,preferred_locale")
    .eq("id", user.id)
    .single();
  if (error) throw Error("profile_unavailable");
  const { result } = await searchParams;
  const hidden = (action: string) => (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="action" value={action} />
    </>
  );
  return (
    <main className="mx-auto grid min-h-[100svh] max-w-4xl gap-6 bg-[var(--warm-ivory)] px-5 py-8 sm:p-10">
      <Link href={`/${locale}`} className="min-h-11 font-bold">
        Darb REST
      </Link>
      <InviteSession locale={locale} destination="account" />
      <h1 className="text-3xl font-bold">{L.account}</h1>
      <p>{L.accountHelp}</p>
      {result && (
        <p role="status">
          {result === "saved"
            ? L.saved
            : result === "pendingEmail"
              ? L.pendingEmail
              : result === "emailConflict"
                ? L.emailConflict
                : L.failed}
        </p>
      )}
      <form action={updateAccount} className="grid gap-4 rounded-xl bg-white p-5">
        {hidden("profile")}
        <label className="grid gap-2">
          {L.name}
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={profile.full_name}
            autoComplete="name"
            className="min-h-12 rounded-lg border px-3"
          />
        </label>
        <label className="grid gap-2">
          {L.phone}
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            defaultValue={profile.phone ?? ""}
            dir="ltr"
            className="min-h-12 rounded-lg border px-3"
          />
        </label>
        <label className="grid gap-2">
          {L.locale}
          <select
            name="preferred"
            defaultValue={profile.preferred_locale}
            className="min-h-12 rounded-lg border px-3"
          >
            {(["ar", "he", "en"] as const).map((l) => (
              <option key={l} value={l} lang={l}>
                {LOCALE_CONFIGS[l].nativeName}
              </option>
            ))}
          </select>
        </label>
        <AccountSubmit label={L.save} />
      </form>
      <form action={updateAccount} className="grid gap-4 rounded-xl bg-white p-5">
        {hidden("email")}
        <label className="grid gap-2">
          {L.email}
          <input
            name="email"
            required
            type="email"
            maxLength={254}
            defaultValue={user.email}
            autoComplete="email"
            dir="ltr"
            className="min-h-12 rounded-lg border px-3"
          />
        </label>
        {user.new_email && (
          <p>
            {L.pendingEmail} <b dir="ltr">{user.new_email}</b>
          </p>
        )}
        <AccountSubmit label={L.emailChange} />
      </form>
      <form action={updateAccount} className="grid gap-4 rounded-xl bg-white p-5">
        {hidden("password")}
        <PasswordFields locale={locale} />
        <AccountSubmit label={L.passwordChange} />
      </form>
    </main>
  );
}
