"use client";
import { useT } from "@/lib/i18n";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <main id="main" className="mx-auto max-w-md flex-1 px-6 text-center" style={{ paddingTop: "calc(var(--nav-h) + 80px)" }}>
      <h1 className="text-2xl font-bold">{t("error.pageTitle")}</h1>
      <p className="mono mt-2 text-sm text-text-2">{error.digest ?? error.message}</p>
      <button type="button" className="btn btn-primary mt-6" onClick={reset}>{t("common.retry")}</button>
    </main>
  );
}