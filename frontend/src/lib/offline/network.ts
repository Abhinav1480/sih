"use client";

import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { isNative } from "../native";

export interface NetworkStatus {
  online: boolean;
  connectionType: string;
  /** ISO time of the last status change seen by this hook (null until one happens). */
  since: string | null;
}

const initial = (): NetworkStatus => ({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  connectionType: "unknown",
  since: null,
});

/** Live connectivity: @capacitor/network on device, window online/offline events on the web. */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(initial);

  useEffect(() => {
    const now = () => new Date().toISOString();
    if (isNative()) {
      let cancelled = false;
      Network.getStatus()
        .then((s) => {
          if (!cancelled) setStatus({ online: s.connected, connectionType: s.connectionType, since: null });
        })
        .catch(() => {});
      const sub = Network.addListener("networkStatusChange", (s) =>
        setStatus({ online: s.connected, connectionType: s.connectionType, since: now() })
      );
      return () => {
        cancelled = true;
        sub.then((h) => h.remove()).catch(() => {});
      };
    }
    const on = () => setStatus({ online: true, connectionType: "wifi", since: now() });
    const off = () => setStatus({ online: false, connectionType: "none", since: now() });
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return status;
}
