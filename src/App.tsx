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

  if (!currentWorkspace) {
    return <WelcomeScreen />;
  }

  if (currentView === 'studio') {
    return <ComponentStudio />;
  }

  return <MainLayout />;
}

export default App;
