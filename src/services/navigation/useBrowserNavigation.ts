import { useEffect } from 'react';
import { browserHistoryPort, startBrowserNavigation } from './browserNavigation';

export function useBrowserNavigation() {
  useEffect(() => {
    const controller = startBrowserNavigation(browserHistoryPort());
    return controller.dispose;
  }, []);
}
