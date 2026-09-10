"use client";

import { useEffect, useRef, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { isNative } from "../native";
import { BOUNDARIES } from "./boundaries";
import { evaluate, type GeofenceStatus, type LatLon } from "./geo";

export interface GeofencePosition {
  lat: number;
  lon: number;
  accuracy?: number;
  /** ISO timestamp of the fix. */
  at: string;
}

export interface UseGeofenceOptions {
  enabled: boolean;
  source: "gps" | "demo";
  demoPosition?: LatLon | null;
  /** Fired once on every transition INTO severe. */
  onSevere?: () => void;
}

export interface UseGeofenceResult {
  position: GeofencePosition | null;
  status: GeofenceStatus | null;
  error: string | null;
}

const EVAL_INTERVAL_MS = 500;
const SEVERE_VIBRATE_MS = 4000;

export function useGeofence(opts: UseGeofenceOptions): UseGeofenceResult {
  const { enabled, source, demoPosition, onSevere } = opts;
  const [position, setPosition] = useState<GeofencePosition | null>(null);
  const [status, setStatus] = useState<GeofenceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onSevereRef = useRef(onSevere);
  onSevereRef.current = onSevere;

  // --- position source -------------------------------------------------
  useEffect(() => {
    if (!enabled) {
      setPosition(null);
      setStatus(null);
      setError(null);
      return;
    }
    if (source === "demo") {
      setError(null);
      setPosition(
        demoPosition ? { lat: demoPosition.lat, lon: demoPosition.lon, at: new Date().toISOString() } : null
      );
      return;
    }

    let cancelled = false;
    let webId: number | null = null;
    let nativeId: string | null = null;
    const onFix = (lat: number, lon: number, accuracy?: number) => {
      if (cancelled) return;
      setError(null);
      setPosition({ lat, lon, accuracy, at: new Date().toISOString() });
    };
    const onErr = (e: unknown) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
    };

    if (isNative()) {
      (async () => {
        try {
          const perm = await Geolocation.requestPermissions();
          if (perm.location === "denied") throw new Error("Location permission denied");
          const id = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
            if (err) return onErr(err);
            if (pos) onFix(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          });
          if (cancelled) Geolocation.clearWatch({ id });
          else nativeId = id;
        } catch (e) {
          onErr(e);
        }
      })();
    } else if (typeof navigator !== "undefined" && navigator.geolocation) {
      webId = navigator.geolocation.watchPosition(
        (pos) => onFix(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        onErr,
        { enableHighAccuracy: true }
      );
    } else {
      setError("Geolocation unavailable");
    }

    return () => {
      cancelled = true;
      if (webId !== null) navigator.geolocation.clearWatch(webId);
      if (nativeId !== null) Geolocation.clearWatch({ id: nativeId });
    };
  }, [enabled, source, demoPosition?.lat, demoPosition?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- local evaluation, rate-limited to one per 500 ms ------------------
  const lastEvalRef = useRef(0);
  useEffect(() => {
    if (!position) {
      setStatus(null);
      return;
    }
    const run = () => {
      lastEvalRef.current = Date.now();
      setStatus(evaluate(position, BOUNDARIES));
    };
    const wait = EVAL_INTERVAL_MS - (Date.now() - lastEvalRef.current);
    if (wait <= 0) {
      run();
      return;
    }
    const id = window.setTimeout(run, wait); // trailing edge so the last fix is never dropped
    return () => window.clearTimeout(id);
  }, [position]);

  // --- severe: haptic interrupt + callback on entry, repeat every 4 s -----
  const severe = status?.level === "severe";
  useEffect(() => {
    if (!severe) return;
    onSevereRef.current?.();
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    const id = window.setInterval(() => {
      Haptics.vibrate({ duration: 400 }).catch(() => {});
    }, SEVERE_VIBRATE_MS);
    return () => window.clearInterval(id);
  }, [severe]);

  return { position, status, error };
}
