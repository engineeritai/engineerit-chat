import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The WebView's app origin is https://engineerit.ai so Capacitor injects its
 * bridge there. www/ is the offline and error UI (server.errorPath).
 */
const config: CapacitorConfig = {
  appId: "ai.engineerit.app",
  appName: "engineerit AI",
  webDir: "www",
  server: {
    url: "https://engineerit.ai",
    androidScheme: "https",
    iosScheme: "capacitor",
    hostname: "localhost",
    allowNavigation: ["engineerit.ai", "*.engineerit.ai"],
    errorPath: "error.html",
  },
  android: {
    appendUserAgent: "EngineeritApp/1.0",
    backgroundColor: "#F9FAFB",
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    appendUserAgent: "EngineeritApp/1.0",
    backgroundColor: "#F9FAFB",
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#F9FAFB",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#F9FAFB",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "native",
    },
    SystemBars: {
      insetsHandling: "native",
      style: "LIGHT",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
