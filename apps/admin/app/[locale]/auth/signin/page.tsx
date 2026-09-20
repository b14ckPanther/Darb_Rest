"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useTranslation, type SupportedLocale } from "@darb-rest/i18n";
import { Button } from "@darb-rest/ui";
import { IconMail, IconLock, IconShield, IconUser, IconStore } from "@darb-rest/icons";
import { LocaleSwitcher } from "../../../../components/locale-switcher";
import { getBrowserClient } from "@darb-rest/supabase";

export default function SignInPage() {
  const { t, locale } = useTranslation();
  const params = useParams();
  const currentLocale = (params?.locale as SupportedLocale) || locale;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = getBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (
          process.env.NODE_ENV !== "production" &&
          (email === "owner@darb.co.il" ||
            email === "haifa-manager@darb.co.il" ||
            email === "newuser@darb.co.il")
        ) {
          window.location.href = `/auth/dev-login?email=${encodeURIComponent(email)}&redirectUrl=/${currentLocale}`;
          return;
        }
        setErrorMsg(t("auth.invalidCredentials"));
        setLoading(false);
        return;
      }

      window.location.href = `/${currentLocale}`;
    } catch {
      if (
        process.env.NODE_ENV !== "production" &&
        (email === "owner@darb.co.il" ||
          email === "haifa-manager@darb.co.il" ||
          email === "newuser@darb.co.il")
      ) {
        window.location.href = `/auth/dev-login?email=${encodeURIComponent(email)}&redirectUrl=/${currentLocale}`;
        return;
      }
      setErrorMsg(t("auth.invalidCredentials"));
      setLoading(false);
    }
  };

  const handleDevQuickSignIn = (devEmail: string) => {
    window.location.href = `/auth/dev-login?email=${encodeURIComponent(devEmail)}&redirectUrl=/${currentLocale}`;
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: Hero Art (desktop) */}
      <div className="relative hidden lg:block">
        <picture>
          <source srcSet="/images/hero/hero-desktop.webp" type="image/webp" />
          <img
            src="/images/hero/hero-desktop.webp"
            alt=""
            role="presentation"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--darb-green-dark)]/90 via-[var(--darb-green-dark)]/50 to-black/30" />
        <div className="relative z-10 flex h-full flex-col justify-end p-12">
          <div className="mb-5 inline-block">
            <Image
              src="/brand/darb-rest-logo-dark-transparent.webp"
              alt="Darb REST"
              width={160}
              height={48}
              className="h-12 w-auto object-contain drop-shadow-md"
            />
          </div>
          <p className="max-w-sm text-base text-white/80">{t("admin.subtitle")}</p>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex flex-col bg-[var(--bg-canvas)]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Image
            src="/brand/darb-rest-logo-header.png"
            alt="Darb REST"
            width={120}
            height={36}
            className="h-8 w-auto object-contain lg:hidden"
          />
          <div className="lg:ms-auto">
            <LocaleSwitcher currentLocale={currentLocale} />
          </div>
        </div>

        {/* Form Area */}
        <div className="flex flex-1 items-start px-5 pt-6 sm:items-center sm:justify-center sm:px-8">
          <div className="w-full max-w-sm space-y-6">
            {/* Heading */}
            <div>
              <h1 className="text-xl font-bold text-[var(--fg-default)] sm:text-2xl">
                {t("auth.signInTitle")}
              </h1>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{t("auth.signInSubtitle")}</p>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/8 px-4 py-3 text-sm text-[var(--color-danger)]">
                {errorMsg}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="signin-email"
                  className="block text-sm font-medium text-[var(--fg-default)]"
                >
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-[var(--fg-muted)]">
                    <IconMail size={16} />
                  </div>
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    dir="ltr"
                    lang="en"
                    className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] ps-10 pe-4 text-sm text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signin-password"
                  className="block text-sm font-medium text-[var(--fg-default)]"
                >
                  {t("auth.password")}
                </label>
                <div className="relative" dir="ltr">
                  <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-[var(--fg-muted)]">
                    <IconLock size={16} />
                  </div>
                  <input
                    id="signin-password"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    dir="ltr"
                    lang="en"
                    className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] ps-10 pe-20 text-sm text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                  <button
                    type="button"
                    aria-controls="signin-password"
                    aria-pressed={passwordVisible}
                    aria-label={t(passwordVisible ? "auth.hidePassword" : "auth.showPassword")}
                    lang={currentLocale}
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    className="absolute inset-y-0 end-0 min-w-16 rounded-e-[var(--radius-md)] px-3 text-sm font-medium text-[var(--fg-default)] focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {t(passwordVisible ? "auth.hide" : "auth.show")}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="!h-11 w-full justify-center text-sm"
                disabled={loading}
              >
                {loading ? t("auth.signingIn") : t("auth.signInButton")}
              </Button>
            </form>

            {/* Dev Test Accounts */}
            {process.env.NODE_ENV !== "production" && (
              <div className="space-y-3 border-t border-[var(--border-subtle)] pt-5">
                <div className="text-xs font-medium text-[var(--fg-subtle)]">
                  {t("auth.devTestAccounts")}
                </div>
                <div className="space-y-2">
                  {[
                    {
                      email: "owner@darb.co.il",
                      desc: "Owner (Darb Bistro) + Admin (Artisan Café)",
                      icon: <IconShield size={14} />,
                      color: "text-[var(--color-primary)]",
                      bg: "bg-[var(--color-primary)]/10",
                    },
                    {
                      email: "haifa-manager@darb.co.il",
                      desc: "Manager (Haifa Port Branch)",
                      icon: <IconStore size={14} />,
                      color: "text-[var(--color-accent)]",
                      bg: "bg-[var(--color-accent)]/10",
                    },
                    {
                      email: "newuser@darb.co.il",
                      desc: "Registered User (No Business)",
                      icon: <IconUser size={14} />,
                      color: "text-[var(--fg-muted)]",
                      bg: "bg-[var(--bg-surface-elevated)]",
                    },
                  ].map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleDevQuickSignIn(account.email)}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-start transition-colors hover:border-[var(--color-primary)]/40 cursor-pointer"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${account.bg} ${account.color}`}
                      >
                        {account.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-sm font-medium text-[var(--fg-default)]"
                          lang="en"
                          dir="ltr"
                        >
                          {account.email}
                        </div>
                        <div className="truncate text-xs text-[var(--fg-muted)]" lang="en">
                          {account.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
