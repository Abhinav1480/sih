"use client";

/**
 * Short optional onboarding after sign-up: home harbour and boat details.
 * Free-form profile data, saved to the account (or locally for a guest);
 * never a measurement and never fed to the risk engine.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { useSession } from "@/lib/auth/session";
import { getDevicePosition } from "@/lib/store/home";
import { Field } from "@/components/ui";
import { AuthFrame } from "./AuthForms";
import { IconPin } from "@/components/ui/Icons";

export function Onboarding() {
  const t = useT();
  const router = useRouter();
  const { updateProfile } = useSession();
  const [harbour, setHarbour] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [vesselType, setVesselType] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (skip: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const la = Number(lat), lo = Number(lon);
      await updateProfile({
        onboarding_done: true,
        ...(skip ? {} : {
          home_harbour: { name: harbour.trim() || undefined, latitude: Number.isFinite(la) && lat !== "" ? la : undefined, longitude: Number.isFinite(lo) && lon !== "" ? lo : undefined },
          vessel: { name: vesselName.trim() || undefined, type: vesselType.trim() || undefined },
        }),
      });
      router.push("/dashboard");
    } catch {
      setError(t("profile.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title={t("onb.title")}>
      <p className="text-sm text-text-2">{t("onb.note")}</p>
      <form className="mt-5 space-y-5" onSubmit={(e) => { e.preventDefault(); void finish(false); }}>
        <fieldset className="space-y-3">
          <legend className="eyebrow mb-1">{t("onb.harbour")}</legend>
          <Field label={t("profile.homeName")}><input className="field" value={harbour} onChange={(e) => setHarbour(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("profile.lat")}><input className="field mono" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
            <Field label={t("profile.lon")}><input className="field mono" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} /></Field>
          </div>
          <button type="button" className="btn btn-sm" onClick={async () => { const p = await getDevicePosition(); if (p) { setLat(p.latitude.toFixed(4)); setLon(p.longitude.toFixed(4)); } }}><IconPin size={14} />{t("profile.useLocation")}</button>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="eyebrow mb-1">{t("onb.boat")}</legend>
          <Field label={t("profile.vesselName")}><input className="field" value={vesselName} onChange={(e) => setVesselName(e.target.value)} /></Field>
          <Field label={t("profile.vesselType")}><input className="field" value={vesselType} onChange={(e) => setVesselType(e.target.value)} /></Field>
        </fieldset>
        {error && <p role="alert" className="text-sm ink-HIGH">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1" disabled={busy}>{busy ? t("auth.working") : t("onb.done")}</button>
          <button type="button" className="btn" disabled={busy} onClick={() => void finish(true)}>{t("common.skip")}</button>
        </div>
      </form>
    </AuthFrame>
  );
}
