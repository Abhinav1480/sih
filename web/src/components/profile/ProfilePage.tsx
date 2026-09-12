"use client";

/**
 * Profile: account, language, home location, vessel details, emergency
 * contacts, data and sync preferences, theme, sign out. Free-form data the
 * person typed; never a measurement.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang, useT, LANGS, isLang, type Lang } from "@/lib/i18n";
import { useSession, type Profile } from "@/lib/auth/session";
import { getDevicePosition } from "@/lib/store/home";
import { API_BASE, API_MODE, CAPTURE_DATE } from "@/lib/api/client";
import { useTheme } from "@/components/shell/Providers";
import { Field, KV, Mono, Surface, Unavailable } from "@/components/ui";
import { IconPin, IconPlus, IconClose } from "@/components/ui/Icons";
import { CONTRACT_VERSION } from "@/lib/types";

export function ProfilePage() {
  const session = useSession();
  // The form is keyed on the saved profile, so a save (or a sign-in) remounts it with the stored values.
  const formKey = `${session.status}|${session.name ?? ""}|${JSON.stringify(session.profile)}`;
  return <ProfileForm key={formKey} />;
}

function ProfileForm() {
  const t = useT();
  const router = useRouter();
  const { lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const session = useSession();
  const p0 = session.profile;
  const [name, setName] = useState(session.name ?? "");
  const [harbour, setHarbour] = useState(p0.home_harbour?.name ?? "");
  const [lat, setLat] = useState(typeof p0.home_harbour?.latitude === "number" ? String(p0.home_harbour.latitude) : "");
  const [lon, setLon] = useState(typeof p0.home_harbour?.longitude === "number" ? String(p0.home_harbour.longitude) : "");
  const [vesselName, setVesselName] = useState(p0.vessel?.name ?? "");
  const [vesselType, setVesselType] = useState(p0.vessel?.type ?? "");
  const [vesselLength, setVesselLength] = useState(typeof p0.vessel?.length_m === "number" ? String(p0.vessel.length_m) : "");
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>(p0.emergency_contacts ?? []);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setNote(null);
    const la = Number(lat), lo = Number(lon), len = Number(vesselLength);
    const patch: Partial<Profile> = {
      home_harbour: { name: harbour.trim() || undefined, latitude: lat !== "" && Number.isFinite(la) ? la : undefined, longitude: lon !== "" && Number.isFinite(lo) ? lo : undefined },
      vessel: { name: vesselName.trim() || undefined, type: vesselType.trim() || undefined, length_m: vesselLength !== "" && Number.isFinite(len) ? len : undefined },
      emergency_contacts: contacts.filter((c) => c.name.trim() || c.phone.trim()),
    };
    try {
      await session.updateProfile(patch, name.trim() || undefined, lang);
      setNote(t("profile.saved"));
    } catch {
      setNote(t("profile.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
      {session.status === "guest" && <p className="text-sm text-text-2">{t("profile.guestNote")}</p>}

      <Surface as="section" className="p-5 space-y-4">
        <h2 className="font-semibold">{t("profile.account")}</h2>
        <Field label={t("profile.name")}><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <KV label={t("profile.identifier")}>{session.user?.identifier ? session.user.identifier : <Unavailable label={t("common.guest")} />}</KV>
        <Field label={t("profile.language")}>
          <select className="field" value={lang} onChange={(e) => { const l = e.target.value; if (isLang(l)) setLang(l as Lang); }}>
            {LANGS.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
          </select>
        </Field>
      </Surface>

      <Surface as="section" className="p-5 space-y-4">
        <h2 className="font-semibold">{t("profile.home")}</h2>
        <Field label={t("profile.homeName")}><input className="field" value={harbour} onChange={(e) => setHarbour(e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("profile.lat")}><input className="field mono" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
          <Field label={t("profile.lon")}><input className="field mono" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} /></Field>
        </div>
        <button type="button" className="btn btn-sm" onClick={async () => { const p = await getDevicePosition(); if (p) { setLat(p.latitude.toFixed(4)); setLon(p.longitude.toFixed(4)); } }}><IconPin size={14} />{t("profile.useLocation")}</button>
      </Surface>

      <Surface as="section" className="p-5 space-y-4">
        <h2 className="font-semibold">{t("profile.vessel")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("profile.vesselName")}><input className="field" value={vesselName} onChange={(e) => setVesselName(e.target.value)} /></Field>
          <Field label={t("profile.vesselType")}><input className="field" value={vesselType} onChange={(e) => setVesselType(e.target.value)} /></Field>
          <Field label={t("profile.vesselLength")}><input className="field mono" inputMode="decimal" value={vesselLength} onChange={(e) => setVesselLength(e.target.value)} /></Field>
        </div>
      </Surface>

      <Surface as="section" className="p-5 space-y-3">
        <h2 className="font-semibold">{t("profile.contacts")}</h2>
        {contacts.map((c, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label={t("profile.contactName")}><input className="field" value={c.name} onChange={(e) => setContacts((cs) => cs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></Field>
            <Field label={t("profile.contactPhone")}><input className="field mono" inputMode="tel" value={c.phone} onChange={(e) => setContacts((cs) => cs.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} /></Field>
            <button type="button" className="btn btn-quiet self-end" onClick={() => setContacts((cs) => cs.filter((_, j) => j !== i))} aria-label={t("common.delete")}><IconClose size={14} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => setContacts((cs) => [...cs, { name: "", phone: "" }])}><IconPlus size={14} />{t("profile.addContact")}</button>
      </Surface>

      <Surface as="section" className="p-5 space-y-3" id="settings">
        <h2 className="font-semibold">{t("profile.data")}</h2>
        <KV label={t("profile.backend")} mono>{API_MODE === "captures" ? `${t("profile.captureMode")} · ${CAPTURE_DATE}` : API_BASE}</KV>
        <KV label={t("about.contract")} mono>{CONTRACT_VERSION}</KV>
        <Field label={t("profile.theme")}>
          <select className="field" value={theme} onChange={(e) => setTheme(e.target.value === "light" ? "light" : "dark")}>
            <option value="dark">{t("theme.dark")}</option>
            <option value="light">{t("theme.light")}</option>
          </select>
        </Field>
        <button type="button" className="btn btn-sm btn-quiet" onClick={() => { try { localStorage.removeItem("orca.conversations"); localStorage.removeItem("orca.trips"); sessionStorage.clear(); } catch { /* fine */ } setNote(t("profile.saved")); }}>{t("profile.clearLocal")}</button>
      </Surface>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy ? t("auth.working") : t("common.save")}</button>
        {note && <span className="text-sm text-text-2">{note}</span>}
        <span className="flex-1" />
        <button type="button" className="btn" onClick={async () => { await session.signOut(); router.push("/"); }}>{t("nav.signout")}</button>
      </div>
      <p className="text-xs text-text-3"><Mono>{session.user?.id ?? ""}</Mono></p>
    </div>
  );
}
