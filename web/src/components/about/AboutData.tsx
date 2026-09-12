"use client";

import { useT } from "@/lib/i18n";
import { CONTRACT_VERSION } from "@/lib/types";
import { EmptyState, Mono, Surface } from "@/components/ui";

export function AboutData({ html, missing }: { html: string; missing: boolean }) {
  const t = useT();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">{t("about.title")}</h1>
      <p className="text-text-2">{t("about.intro")}</p>
      <p className="text-xs text-text-3">{t("about.docNote")} · {t("about.contract")} <Mono>{CONTRACT_VERSION}</Mono></p>
      {missing ? (
        <EmptyState title={t("common.unavailable")} />
      ) : (
        <Surface className="p-6">
          <div className="prose-doc" lang="en" dangerouslySetInnerHTML={{ __html: html }} />
        </Surface>
      )}
    </div>
  );
}
