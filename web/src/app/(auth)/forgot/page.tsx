import type { Metadata } from "next";
import { Forgot } from "@/components/auth/AuthForms";
export const metadata: Metadata = { title: "Forgot password" };
export default function Page() { return <Forgot />; }