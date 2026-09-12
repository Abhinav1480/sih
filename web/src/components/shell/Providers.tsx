"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { LangProvider, type Lang } from "@/lib/i18n";
import { SessionProvider } from "@/lib/auth/session";

export type Theme = "dark" | "light";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: "dark", setTheme: () => {} });

/** The root element's data-theme attribute is the source of truth; the pre-paint script sets it first. */
function subscribeTheme(cb: () => void): () => void {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const readTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "dark" as Theme);
  const setTheme = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("orca.theme", t);
    } catch {
      /* the choice still applies for this page */
    }
  }, []);
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}

export function Providers({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <LangProvider initial={lang}>
      <ThemeProvider>
        <SessionProvider>{children}</SessionProvider>
      </ThemeProvider>
    </LangProvider>
  );
}
