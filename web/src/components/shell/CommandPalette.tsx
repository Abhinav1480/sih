"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT, useLang, LANGS, type Lang } from "@/lib/i18n";
import { useTheme } from "./Providers";
import { IconSearch } from "@/components/ui/Icons";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

/** Ctrl/Cmd+K: pages, theme, language. Escape closes. Arrow keys move. */
export function CommandPalette() {
  const t = useT();
  const router = useRouter();
  const { setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => router.push(href);
    const pages: [string, string][] = [
      ["/dashboard", t("nav.dashboard")], ["/ai", t("nav.ai")], ["/map", t("nav.map")], ["/alerts", t("nav.alerts")],
      ["/trips", t("nav.trips")], ["/profile", t("nav.profile")], ["/about-data", t("nav.about")],
    ];
    return [
      ...pages.map(([href, label]) => ({ id: href, label, hint: t("common.page"), run: go(href) })),
      { id: "theme", label: t("theme.toggle"), hint: t(`theme.${theme === "dark" ? "light" : "dark"}`), run: () => setTheme(theme === "dark" ? "light" : "dark") },
      ...LANGS.map((l: Lang) => ({ id: `lang-${l}`, label: t(`lang.${l}`), hint: t("lang.label"), run: () => setLang(l) })),
    ];
  }, [t, router, theme, setTheme, setLang]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? commands.filter((c) => c.label.toLowerCase().includes(s) || c.id.includes(s)) : commands;
  }, [q, commands]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQ("");
        setCursor(0);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  if (!open) return null;
  const pick = (c: Cmd) => {
    setOpen(false);
    c.run();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(0,0,0,0.35)] p-4 pt-[15vh]" onMouseDown={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label={t("cmd.open")} className="surface w-full max-w-lg overflow-hidden arrive" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <IconSearch size={18} />
          <input
            ref={input}
            className="w-full bg-transparent outline-none"
            placeholder={t("cmd.placeholder")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, shown.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter" && shown[cursor]) {
                pick(shown[cursor]);
              }
            }}
          />
          <kbd className="mono text-xs text-text-3">Esc</kbd>
        </div>
        <ul role="listbox" className="max-h-80 overflow-auto py-1">
          {shown.length === 0 && <li className="px-4 py-3 text-sm text-text-2">{t("cmd.empty")}</li>}
          {shown.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === cursor}>
              <button
                type="button"
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${i === cursor ? "bg-[var(--accent-tint)]" : ""}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(c)}
              >
                <span>{c.label}</span>
                {c.hint && <span className="text-xs text-text-3">{c.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-hairline px-4 py-2 text-xs text-text-3">{t("cmd.hint")}</div>
      </div>
    </div>
  );
}
