import type { Metadata } from "next";
import { Suspense } from "react";
import { TripsPage } from "@/components/trips/TripsPage";
export const metadata: Metadata = { title: "Trips" };
export default function Page() { return <Suspense fallback={null}><TripsPage /></Suspense>; }