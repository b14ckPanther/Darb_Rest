import Link from "next/link";
import Image from "next/image";
import { getServerClient } from "@darb-rest/supabase/server";
import { activationLabels, isValidLocale } from "@darb-rest/i18n";
import { notFound } from "next/navigation";
import { customerAgreement } from "../../../../lib/customer-activation";
import { activateAccount } from "../../../../lib/actions/account";
import { PasswordFields, AccountSubmit } from "../../../../components/account-form";
import { InviteSession } from "../../../../components/invite-session";
import { LocaleSwitcher } from "../../../../components/locale-switcher";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Accept({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const L = activationLabels[locale];
  const {
    data: { user },
  } = await (await getServerClient()).auth.getUser();
  const record = user ? await customerAgreement(user.id, true) : null;
  const { result } = await searchParams;
  return (
    <main className="grid min-h-[100svh] place-items-center bg-[var(--warm-ivory)] px-5 py-8">
      <div className="grid w-full max-w-md gap-5">
        <Image
          src="/brand/darb-rest-logo-header.png"
          alt="Darb REST"
          width={120}
          height={40}
          loading="eager"
          style={{ width: 120, height: "auto" }}
        />
        <LocaleSwitcher currentLocale={locale} />
        <h1 className="text-3xl font-bold">{L.activate}</h1>
        <InviteSession locale={locale} />
        {result && <p role="alert">{L.failed}</p>}
        {!record || !user?.email_confirmed_at ? (
          <>
            <p>{L.invalid}</p>
            <p>{L.existing}</p>
            <Link href={`/${locale}/auth/signin?next=activation`} className="min-h-12 underline">
              {L.signin}
            </Link>
          </>
        ) : record.activation.activated_at ? (
          <>
            <p>{L.accepted}</p>
            <Link
              href={record.activation.business_id ? `/${locale}` : `/${locale}/onboarding`}
              className="min-h-12 underline"
            >
              {L.continue}
            </Link>
          </>
        ) : (
          <form action={activateAccount} className="grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <p dir="auto">{record.agreement.customer_name}</p>
            {record.activation.invite_state === "existing_account" ? (
              <p>{L.signedIn}</p>
            ) : (
              <PasswordFields locale={locale} />
            )}
            <AccountSubmit label={L.activate} />
          </form>
        )}
      </div>
    </main>
  );
}
