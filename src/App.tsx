import { useEffect, useState, lazy, Suspense } from 'react';
import { useAppStore, startAutoSave, stopAutoSave, setDiagramDataInStore } from './store/useAppStore';
import { StorageService } from './services/storage';
import { 
  isForge, 
  safeGetForgeContext, 
  safeSetForgeHeight, 
  openForgeEditorModal, 
  closeForgeModal 
} from './services/forgeBridge';

// ── Always loaded (lightweight, needed on every render path) ──────────────
import { ConfluenceViewerLayout } from './components/layout/ConfluenceViewerLayout';
import { GlobalConfirmAlertModal } from './components/layout/GlobalConfirmAlertModal';

// ── Lazy loaded (heavy components, only loaded when needed) ───────────────
const MainLayout = lazy(() => import('./components/layout/MainLayout').then(m => ({ default: m.MainLayout })));
const ComponentStudio = lazy(() => import('./components/studio/ComponentStudio').then(m => ({ default: m.ComponentStudio })));
const WelcomeScreen = lazy(() => import('./components/welcome/WelcomeScreen').then(m => ({ default: m.WelcomeScreen })));
const SharedDiagramLayout = lazy(() => import('./components/layout/SharedDiagramLayout').then(m => ({ default: m.SharedDiagramLayout })));
const ImportPreviewLayout = lazy(() => import('./components/layout/ImportPreviewLayout').then(m => ({ default: m.ImportPreviewLayout })));
const ShareLoader = lazy(() => import('./components/share/ShareLoader').then(m => ({ default: m.ShareLoader })));

// ── Loading fallback for lazy components ──────────────────────────────────
const LazyFallback = () => (
  <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-slate-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">Loading...</span>
    </div>
  </div>
);

function App() {
  const currentWorkspace = useAppStore((state) => state.currentWorkspace);
  const loadAppPreferences = useAppStore((state) => state.loadAppPreferences);
  const currentView = useAppStore((state) => state.currentView);
  const isReadOnly = useAppStore((state) => state.isReadOnly);
  const viewMode = useAppStore((state) => state.viewMode);
  const manualSave = useAppStore((state) => state.manualSave);
  const language = useAppStore((state) => state.language);

  const [isEditingInConfluence, setIsEditingInConfluence] = useState(false);
  const [isForgeModal, setIsForgeModal] = useState(false);
  const isForgeMode = isForge();

  const initFullscreenListener = useAppStore((state) => state.initFullscreenListener);

  const reloadCurrentForgeDiagram = async (stablePath: string) => {
    try {
      const diagJson = await StorageService.load_diagram(stablePath, 'default');
      const diag = JSON.parse(diagJson);
      
      let loadedLogical = { schemaVersion: 2, nodes: [], edges: [], sequences: [] };
      let loadedVisual = { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} };

      if (diag.logicalData && Array.isArray(diag.logicalData.nodes)) {
        loadedLogical = diag.logicalData;
        loadedVisual = diag.visualData || loadedVisual;
      } else if (diag.logical) {
        loadedLogical = diag.logical;
        loadedVisual = diag.visual || loadedVisual;
      }

      setDiagramDataInStore(loadedLogical, loadedVisual, false);
    } catch (e) {
      console.log('No diagram data found to reload:', e);
    }
  };

  useEffect(() => {
    loadAppPreferences();
    initFullscreenListener();

    if (isForgeMode) {
      const initForgeWorkspace = async () => {
        try {
          const ctx = await safeGetForgeContext();
          const extType = (ctx as any)?.extension?.type;
          const isModal = extType === 'modal' || extType === 'fullPage' || !!(ctx as any)?.extension?.modal?.macroLocalId;
          setIsForgeModal(isModal);

          const localId = (ctx as any)?.extension?.modal?.macroLocalId || 
                          (ctx as any)?.localId ||
                          (ctx as any)?.extension?.localId || 
                          (ctx as any)?.extension?.pageId || 
                          (ctx as any)?.pageId ||
                          'confluence_default_macro';
          
          const stablePath = `virtual://confluence/${localId}`;

          const ws: import('./types').WorkspaceMeta = {
            id: localId,
            name: 'Confluence Diagram',
            path: stablePath,
            description: 'Interactive Confluence Architecture Diagram',
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
          };

          useAppStore.setState({ 
            currentWorkspace: ws,
            activeDiagramId: 'default',
            openDiagramIds: ['default'],
            diagrams: [{ id: 'default', name: 'Default Diagram', updatedAt: new Date().toISOString() }],
            isReadOnly: !isModal,
            isDirty: false,
            isPlaying: false,
            currentTime: 0,
          });

          await reloadCurrentForgeDiagram(stablePath);
        } catch (err) {
          console.error('Error initializing Forge workspace:', err);
        }
      };
      initForgeWorkspace();
    }

    // Google Drive Sync — dynamically imported so it doesn't add to initial bundle
    if (!isForgeMode) {
      const isGoogleSyncEnabled = import.meta.env.VITE_ENABLE_GOOGLE_SYNC === 'true';
      if (isGoogleSyncEnabled) {
        import('./services/googleDriveAPI').then(({ GoogleDriveService }) => {
          GoogleDriveService.initAuth();
          const currentUser = useAppStore.getState().googleUser;
          if (currentUser) {
            GoogleDriveService.downloadFromDrive().catch(console.error);
          }
        }).catch(console.error);
      }
    }

    startAutoSave();

    return () => {
      stopAutoSave();
    };
  }, []);

  useEffect(() => {
    // Service Worker update check — skip in Forge mode (Confluence iframe)
    if (isForgeMode) return;
    if ('serviceWorker' in navigator) {
      const interval = setInterval(() => {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.update();
          })
          .catch((err) => {
            console.error('Service Worker update check failed:', err);
          });
      }, 30 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (isForgeMode && !isForgeModal) {
      useAppStore.setState({ isReadOnly: !isEditingInConfluence });
      safeSetForgeHeight(480);
    }
  }, [isForgeMode, isForgeModal, isEditingInConfluence]);

  const handleEditClick = () => {
    if (isForgeMode) {
      const localId = currentWorkspace?.id || 'default_macro';
      openForgeEditorModal(localId, () => {
        if (currentWorkspace?.path) {
          reloadCurrentForgeDiagram(currentWorkspace.path);
        }
      });
    } else {
      setIsEditingInConfluence(true);
    }
  };

  // ── Confluence View Mode (inline macro on page) ─────────────────────────
  // This is the FAST path — no lazy components needed, no Suspense boundaries
  if (isForgeMode && !isForgeModal && !isEditingInConfluence) {
    return (
      <>
        <GlobalConfirmAlertModal />
        <ConfluenceViewerLayout onEdit={handleEditClick} />
      </>
    );
  }

  // ── Confluence Full-Screen Modal Editor ─────────────────────────────────
  if (isForgeModal) {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden relative bg-slate-900 font-sans">
        <GlobalConfirmAlertModal />
        <div className="h-11 bg-indigo-600 text-white px-4 flex items-center justify-between z-30 shrink-0 shadow-md">
          <span className="text-xs font-bold tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {language === 'tr' ? '✏️ Confluence Diyagram Düzenleyici (Tam Ekran)' : '✏️ Editing Confluence Diagram (Full Screen)'}
          </span>
          <button
            onClick={async () => {
              await manualSave();
              await closeForgeModal({ saved: true });
            }}
            className="px-4 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-md text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {language === 'tr' ? '✓ Tamamla & Kaydet' : '✓ Done & Save'}
          </button>
        </div>
        <div className="flex-1 min-h-0 relative flex flex-col">
          <Suspense fallback={<LazyFallback />}>
            <MainLayout />
          </Suspense>
        </div>
      </div>
    );
  }

  // Check if loading a shared URL or embed URL
  const isShareOrEmbedUrl = window.location.href.includes('share=') || window.location.href.includes('embed');

  // ── Desktop/Web Welcome Screen ──────────────────────────────────────────
  if (!currentWorkspace && viewMode !== 'import-preview' && !isForgeMode && !isShareOrEmbedUrl) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <ShareLoader />
        <GlobalConfirmAlertModal />
        <WelcomeScreen />
      </Suspense>
    );
  }

  // ── Desktop/Web Main Application ────────────────────────────────────────
  return (
    <Suspense fallback={<LazyFallback />}>
      <ShareLoader />
      <GlobalConfirmAlertModal />
      {viewMode === 'import-preview' ? (
        <ImportPreviewLayout />
      ) : isReadOnly ? (
        <SharedDiagramLayout />
      ) : currentView === 'studio' ? (
        <ComponentStudio />
      ) : (
        <div className="h-screen w-screen flex flex-col overflow-hidden relative">
          {isForgeMode && (
            <div className="h-10 bg-indigo-600 text-white px-4 flex items-center justify-between z-30 shrink-0 shadow-md font-sans">
              <span className="text-xs font-bold tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {language === 'tr' ? 'Confluence Diyagramı Düzenleniyor' : 'Editing Confluence Diagram'}
              </span>
              <button
                onClick={async () => {
                  await manualSave();
                  setIsEditingInConfluence(false);
                }}
                className="px-3 py-1 bg-white text-indigo-700 hover:bg-indigo-50 rounded-md text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {language === 'tr' ? '✓ Düzenlemeyi Kaydet & Kapat' : '✓ Done & Save'}
              </button>
            </div>
          )}
          <div className="flex-1 min-h-0 relative flex flex-col">
            <MainLayout />
          </div>
        </div>
      )}
    </Suspense>
  );
}

export default App;
