import { useEffect } from 'react';
import { useAppStore, startAutoSave, stopAutoSave } from './store/useAppStore';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { MainLayout } from './components/layout/MainLayout';
import { ComponentStudio } from './components/studio/ComponentStudio';

function App() {
  const currentWorkspace = useAppStore((state) => state.currentWorkspace);
  const loadAppPreferences = useAppStore((state) => state.loadAppPreferences);
  const currentView = useAppStore((state) => state.currentView);

  useEffect(() => {
    // Load app preferences (language and theme) on startup
    loadAppPreferences();

    // Start auto-save background loop on app initialization
    startAutoSave();
    return () => {
      // Clean up on component unmount
      stopAutoSave();
    };
  }, []);

  useEffect(() => {
    // Periodically check for Service Worker updates every 30 minutes.
    // When a new SW is activated, autoUpdate in vite-plugin-pwa triggers page reload.
    if ('serviceWorker' in navigator) {
      const interval = setInterval(() => {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.update();
          })
          .catch((err) => {
            console.error('Service Worker update check failed:', err);
          });
      }, 30 * 60 * 1000); // 30 minutes

      return () => clearInterval(interval);
    }
  }, []);

  if (!currentWorkspace) {
    return <WelcomeScreen />;
  }

  if (currentView === 'studio') {
    return <ComponentStudio />;
  }

  return <MainLayout />;
}

export default App;
