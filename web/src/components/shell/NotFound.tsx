"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { Navbar } from "./Navbar";

export function NotFound() {
  const t = useT();
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-md flex-1 px-6 text-center" style={{ paddingTop: "calc(var(--nav-h) + 80px)" }}>
        <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
        <p className="mt-2 text-text-2">{t("notFound.body")}</p>
        <Link href="/" className="btn btn-primary mt-6">{t("common.back")}</Link>
      </main>
    </>
  );
}