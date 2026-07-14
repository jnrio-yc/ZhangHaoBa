import { useEffect } from "react";
import { HashRouter } from "react-router-dom";
import { AppRouter } from "./router";
import { ToastProvider } from "@/components/common/Toast";
import { useSettingsStore } from "@/stores/settingsStore";
import { initSyncStatus, triggerSyncInBackground } from "@/services/syncRunner";

function ThemeInit() {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);
  return null;
}

function SyncInit() {
  useEffect(() => {
    void (async () => {
      await initSyncStatus();
      triggerSyncInBackground();
    })();
  }, []);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <ThemeInit />
        <SyncInit />
        <AppRouter />
      </ToastProvider>
    </HashRouter>
  );
}
