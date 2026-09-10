import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.orca.marine",
  appName: "ORCA",
  webDir: "out",
  android: {
    // Dev only: lets the WebView call the laptop backend over plain http on the LAN.
    // Drop before a release build (see AndroidManifest usesCleartextTraffic).
    allowMixedContent: true,
    backgroundColor: "#04141d",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#04141d",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: { style: "DARK", backgroundColor: "#04141d" },
  },
};

export default config;
