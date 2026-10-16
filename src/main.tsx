import { isForge, isConfluenceDC, isTauri } from './services/storage';
import { canPreloadWelcome } from './services/startupRoute';
if (import.meta.env.VITE_PROFILE_STARTUP === 'true') void import('./dev/startupProfile');
import { PwaStatus } from './components/layout/PwaStatus';
import { NavigationStatus } from './components/layout/NavigationStatus';
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Resolve the ordinary home route before its first render, avoiding a short-lived
// Suspense fallback. Host, desktop, shared and restored diagram routes stay lazy.
async function bootstrap() {
  let initialWelcome: typeof import('./components/welcome/WelcomeScreen').WelcomeScreen | undefined;
  let preferencesLoaded = false;
  if (canPreloadWelcome(window.location.href, window.parent === window, isTauri(), isForge() || isConfluenceDC())) {
    try {
      const [module, { useAppStore }, { StorageService }] = await Promise.all([
        import('./components/welcome/WelcomeScreen'), import('./store/useAppStore'), import('./services/storage'),
      ]);
      if (StorageService.getMode() === 'localstorage') {await useAppStore.getState().loadAppPreferences();preferencesLoaded=true;}
      initialWelcome = module.WelcomeScreen;
    } catch { /* The normal lazy route retains its existing loading/error behavior. */ }
  }
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App initialWelcome={initialWelcome} preferencesLoaded={preferencesLoaded} />
      <NavigationStatus />
      <PwaStatus />
    </React.StrictMode>,
  );
}
void bootstrap();
