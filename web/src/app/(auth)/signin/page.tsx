import type { Metadata } from "next";
import { SignIn } from "@/components/auth/AuthForms";
export const metadata: Metadata = { title: "Sign in" };
export default function Page() { return <SignIn />; }