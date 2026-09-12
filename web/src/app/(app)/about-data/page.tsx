import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { marked } from "marked";
import { AboutData } from "@/components/about/AboutData";

export const metadata: Metadata = { title: "About the data" };

/**
 * About the data: docs/DATA_SOURCES.md rendered as it stands in the
 * repository, read at build time, so the page can never say more than the
 * project's own source register does. The chrome around it is localised;
 * the register itself is the project's English document and the page says so.
 */
export default async function Page() {
  let html = "";
  let missing = false;
  try {
    const md = await readFile(join(process.cwd(), "..", "docs", "DATA_SOURCES.md"), "utf8");
    html = await marked.parse(md, { gfm: true });
  } catch {
    missing = true;
  }
  return <AboutData html={html} missing={missing} />;
}
