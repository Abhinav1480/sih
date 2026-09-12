import type { Metadata } from "next";
import { OrcaAI } from "@/components/ai/OrcaAI";

export const metadata: Metadata = { title: "ORCA AI" };

export default function Page() {
  return <OrcaAI />;
}
