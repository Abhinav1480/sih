import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

/** True inside the Capacitor Android/iOS shell, false in a plain browser. */
export const isNative = (): boolean => typeof window !== "undefined" && Capacitor.isNativePlatform();

type BackHandler = () => boolean; // return true = consumed
const backHandlers: BackHandler[] = [];

/**
 * Register a hardware back-button handler. Handlers run newest-first; the
 * first one returning true wins. With nothing to close the app is minimised,
 * never killed, so state (cached result, GPS watch) survives.
 */
export function registerBackHandler(fn: BackHandler): () => void {
  backHandlers.push(fn);
  return () => {
    const i = backHandlers.indexOf(fn);
    if (i >= 0) backHandlers.splice(i, 1);
  };
}

let initialised = false;
/** One-time native chrome setup. Safe to call on web (no-op). */
export async function initNativeShell(): Promise<void> {
  if (!isNative() || initialised) return;
  initialised = true;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#04141d" });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    /* status bar plugin unavailable on this build */
  }
  App.addListener("backButton", () => {
    for (let i = backHandlers.length - 1; i >= 0; i--) {
      if (backHandlers[i]()) return;
    }
    App.minimizeApp();
  });
  try {
    await SplashScreen.hide();
  } catch {
    /* no splash on this platform */
  }
}
