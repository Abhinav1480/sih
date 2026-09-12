import type { Metadata } from "next";
import { SignUp } from "@/components/auth/AuthForms";
export const metadata: Metadata = { title: "Create account" };
export default function Page() { return <SignUp />; }