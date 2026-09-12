"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang, useT, LANGS, type Lang } from "@/lib/i18n";
import { useSession } from "@/lib/auth/session";
import { useTheme } from "./Providers";
import { IconMoon, IconSun, IconUser, IconChevron } from "@/components/ui/Icons";

const LINKS: { href: string; key: "nav.dashboard" | "nav.ai" | "nav.map" | "nav.alerts" | "nav.trips" }[] = [
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/ai", key: "nav.ai" },
  { href: "/map", key: "nav.map" },
  { href: "/alerts", key: "nav.alerts" },
  { href: "/trips", key: "nav.trips" },
];

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-lg">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="2" />
        <path d="M5 13.5c2 0 2-2.5 4-2.5s2 2.5 4 2.5 2-2.5 4-2.5 1.5 1.5 2 2" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      ORCA
    </Link>
  );
}

export function ThemeToggle() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="btn btn-quiet" onClick={() => setTheme(next)} aria-label={t("theme.toggle")} title={t(`theme.${next}`)}>
      {theme === "dark" ? <IconSun /> : <IconMoon />}
    </button>
  );
}

export function LangSelect({ className = "" }: { className?: string }) {
  const t = useT();
  const { lang, setLang } = useLang();
  return (
    <label className={`inline-flex items-center gap-1 ${className}`}>
      <span className="sr-only">{t("lang.label")}</span>
      <select className="field !w-auto !py-1.5 !px-2 text-sm" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
        {LANGS.map((l) => (
          <option key={l} value={l}>{t(`lang.${l}`)}</option>
        ))}
      </select>
    </label>
  );
}

function AccountMenu() {
  const t = useT();
  const router = useRouter();
  const { status, name, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "loading") return <div className="skeleton h-9 w-9 rounded-full" />;
  if (status === "signed_out") {
    return (
      <div className="flex items-center gap-1">
        <Link href="/signin" className="btn btn-quiet btn-sm">{t("nav.signin")}</Link>
        <Link href="/signup" className="btn btn-primary btn-sm">{t("nav.signup")}</Link>
      </div>
    );
  }
  const initial = (name ?? t("common.guest")).trim().charAt(0).toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn btn-quiet !px-2 gap-1"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.menu")}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent-tint)] text-sm font-bold text-[var(--accent)]">
          {initial || <IconUser size={16} />}
        </span>
        <IconChevron size={14} />
      </button>
      {open && (
        <div role="menu" className="surface absolute right-0 mt-2 w-56 overflow-hidden py-1 shadow-none arrive">
          <div className="px-4 py-2 text-sm">
            <div className="font-semibold truncate">{name ?? t("common.guest")}</div>
            <div className="text-xs text-text-3">{status === "guest" ? t("common.guest") : t("profile.account")}</div>
          </div>
          <div className="border-t border-hairline my-1" />
          <MenuItem href="/profile" onPick={() => setOpen(false)}>{t("nav.profile")}</MenuItem>
          <MenuItem href="/profile#settings" onPick={() => setOpen(false)}>{t("nav.settings")}</MenuItem>
          <MenuItem href="/about-data" onPick={() => setOpen(false)}>{t("nav.about")}</MenuItem>
          <div className="border-t border-hairline my-1" />
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-2 text-left text-sm hover:bg-[var(--accent-tint)]"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/");
            }}
          >
            {t("nav.signout")}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ href, children, onPick }: { href: string; children: React.ReactNode; onPick: () => void }) {
  return (
    <Link href={href} role="menuitem" className="block px-4 py-2 text-sm hover:bg-[var(--accent-tint)]" onClick={onPick}>
      {children}
    </Link>
  );
}

export function Navbar() {
  const t = useT();
  const path = usePathname();
  return (
    <header className="glass fixed inset-x-0 top-0 z-40" style={{ height: "var(--nav-h)" }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 btn btn-primary btn-sm">{t("nav.skip")}</a>
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4 px-6">
        <div className="flex w-40 items-center"><Wordmark /></div>
        <nav aria-label={t("nav.menu")} className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link" aria-current={path?.startsWith(l.href) ? "page" : undefined}>
              {t(l.key)}
            </Link>
          ))}
        </nav>
        <div className="flex w-auto items-center justify-end gap-1">
          <LangSelect className="hidden sm:inline-flex" />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
