import { useSketchFonts } from './styles/useSketchFonts';
import { message } from './i18n/messages';
import { useTranslation } from './i18n/useTranslation';
import { useBrowserNavigation } from './services/navigation/useBrowserNavigation';
import { saveCurrentDiagram } from './services/saveCoordinator';
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
import {
  isConfluenceDC,
  getConfluenceDcContext,
  closeConfluenceDcModal
} from './services/confluenceDcBridge';

// ── Always loaded (lightweight, needed on every render path) ──────────────
const ConfluenceViewerLayout = lazy(() => import('./components/layout/ConfluenceViewerLayout').then(m => ({ default: m.ConfluenceViewerLayout })));
import { GlobalConfirmAlertModal } from './components/layout/GlobalConfirmAlertModal';

// ── Lazy loaded (heavy components, only loaded when needed) ───────────────
const MainLayout = lazy(() => import('./components/layout/MainLayout').then(m => ({ default: m.MainLayout })));
const ComponentStudio = lazy(() => import('./components/studio/ComponentStudio').then(m => ({ default: m.ComponentStudio })));
const WelcomeScreen = lazy(() => import('./components/welcome/WelcomeScreen').then(m => ({ default: m.WelcomeScreen })));
const SharedDiagramLayout = lazy(() => import('./components/layout/SharedDiagramLayout').then(m => ({ default: m.SharedDiagramLayout })));
const ImportPreviewLayout = lazy(() => import('./components/layout/ImportPreviewLayout').then(m => ({ default: m.ImportPreviewLayout })));
const ShareLoader = lazy(() => import('./components/share/ShareLoader').then(m => ({ default: m.ShareLoader })));
const CollabJoinModal = lazy(() => import('./components/collab/CollabJoinModal').then(m => ({ default: m.CollabJoinModal })));

// ── Loading fallback for lazy components ──────────────────────────────────
const LazyFallback = () => {
  const t = useTranslation();
  return (
  <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-slate-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide" role="status">{t.commonUi.loading}</span>
    </div>
  </div>
  );
};

function App({ initialWelcome, preferencesLoaded = false }: {initialWelcome?: typeof import('./components/welcome/WelcomeScreen').WelcomeScreen; preferencesLoaded?: boolean} = {}) {
  const Welcome = initialWelcome ?? WelcomeScreen;
  useSketchFonts();
  useBrowserNavigation();
  useEffect(() => {
    if (!(window as any).__TAURI_INTERNALS__) return;
    let disposed = false;
    let unregister: (() => void) | undefined;
    Promise.all([
      import('@tauri-apps/api/window'),
      import('./services/nativeCloseGuard'),
      import('./services/saveCoordinator'),
    ]).then(async ([{ getCurrentWindow }, { registerNativeCloseGuard }, { ensureSavedForNavigation }]) => {
      if (disposed) return;
      const cleanup = await registerNativeCloseGuard(getCurrentWindow(), useAppStore.getState, ensureSavedForNavigation, error => {
        useAppStore.setState({ saveError: error instanceof Error ? error.message : String(error) });
      });
      if (disposed) cleanup(); else unregister = cleanup;
    }).catch(error => console.error('Native close guard could not be registered:', error));
    return () => { disposed = true; unregister?.(); };
  }, []);

  const currentWorkspace = useAppStore((state) => state.currentWorkspace);
  const loadAppPreferences = useAppStore((state) => state.loadAppPreferences);
  const currentView = useAppStore((state) => state.currentView);
  const isReadOnly = useAppStore((state) => state.isReadOnly);
  const viewMode = useAppStore((state) => state.viewMode);
  const language = useAppStore((state) => state.language);

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  const [isEditingInConfluence, setIsEditingInConfluence] = useState(false);
  const [isForgeModal, setIsForgeModal] = useState(false);
  const isForgeMode = isForge();
  const isDcMode = isConfluenceDC();

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

      const searchParams = new URLSearchParams(window.location.search);
      const shouldAutoPlay = searchParams.get('autoplay') === 'true';

      setDiagramDataInStore(loadedLogical, loadedVisual, shouldAutoPlay);
    } catch (e) {
      console.log('No diagram data found to reload:', e);
    }
  };

  useEffect(() => {
    if (!preferencesLoaded) void loadAppPreferences();
    const cleanupFullscreen = initFullscreenListener();

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
    } else if (isDcMode) {
      const initDcWorkspace = async () => {
        try {
          const dcCtx = getConfluenceDcContext();
          const stablePath = `confluence-dc://${dcCtx.pageId}/${dcCtx.macroId}`;
          const isModal = dcCtx.isEditMode;

          const ws: import('./types').WorkspaceMeta = {
            id: `${dcCtx.pageId}_${dcCtx.macroId}`,
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
          console.error('Error initializing Confluence DC workspace:', err);
        }
      };
      initDcWorkspace();
    }

    const searchParams = new URLSearchParams(window.location.search);
    const isModalEditor =
      searchParams.get('mode') === 'modal' ||
      searchParams.get('integration') === 'iframe' ||
      searchParams.get('embed_editor') === 'true';

    if (isModalEditor && !isForgeMode && !isDcMode) {
      const initModalEditorWorkspace = async () => {
        try {
          const stablePath = `embed://workspace/default`;
          const ws: import('./types').WorkspaceMeta = {
            id: 'embed_default',
            name: 'Embedded Diagram',
            path: stablePath,
            description: 'Embedded Interactive Diagram',
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
          };

          useAppStore.setState({
            currentWorkspace: ws,
            activeDiagramId: 'default',
            openDiagramIds: ['default'],
            diagrams: [{ id: 'default', name: 'Default Diagram', updatedAt: new Date().toISOString() }],
            isReadOnly: false,
            isDirty: false,
            isPlaying: false,
            currentTime: 0,
          });

          await reloadCurrentForgeDiagram(stablePath);
        } catch (err) {
          console.error('Error initializing Modal Editor workspace:', err);
        }
      };
      initModalEditorWorkspace();
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
      cleanupFullscreen();
      stopAutoSave();
    };
  }, []);

  useEffect(() => {
    if (isForgeMode && !isForgeModal) {
      useAppStore.setState({ isReadOnly: !isEditingInConfluence });
      safeSetForgeHeight(480);
    }
  }, [isForgeMode, isForgeModal, isEditingInConfluence]);

  const [isSavingConfluence, setIsSavingConfluence] = useState(false);

  const handleEditClick = () => {
    if (isForgeMode) {
      const localId = currentWorkspace?.id || 'default_macro';
      openForgeEditorModal(localId, () => {
        if (currentWorkspace?.path) {
          reloadCurrentForgeDiagram(currentWorkspace.path);
        }
      });
    } else if (isDcMode) {
      const dcCtx = getConfluenceDcContext();
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'CONFLUENCE_DC_OPEN_MODAL', pageId: dcCtx.pageId, macroId: dcCtx.macroId }, '*');
      } else {
        setIsEditingInConfluence(true);
      }
    } else {
      setIsEditingInConfluence(true);
    }
  };

  const handleConfluenceSaveAndClose = async () => {
    if (isSavingConfluence) return;
    setIsSavingConfluence(true);
    try {
      const saved = await saveCurrentDiagram(true);
      if (!saved || useAppStore.getState().isDirty) { useAppStore.setState({ saveError: useAppStore.getState().saveError ?? 'CHANGES_NOT_SAVED' }); return; }
      if (isForgeModal) await closeForgeModal({ saved: true });
      else if (isDcMode) closeConfluenceDcModal(true);
      setIsEditingInConfluence(false);
    } finally {
      setIsSavingConfluence(false);
    }

  };

  // ── Confluence View Mode (inline macro on page) ─────────────────────────
  // Viewer dependencies load only for the host viewer route.
  if ((isForgeMode && !isForgeModal && !isEditingInConfluence) || (isDcMode && !getConfluenceDcContext().isEditMode && !isEditingInConfluence)) {
    return (
      <>
        <GlobalConfirmAlertModal />
        <Suspense fallback={<LazyFallback />}><ConfluenceViewerLayout onEdit={handleEditClick} /></Suspense>
      </>
    );
  }

  // ── Confluence Full-Screen Modal Editor ─────────────────────────────────
  const isConfluenceEditModal = isForgeModal || (isDcMode && getConfluenceDcContext().isEditMode);

  if (isConfluenceEditModal) {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden relative bg-slate-900 font-sans">
        <GlobalConfirmAlertModal />
        <div className="h-11 bg-indigo-600 text-white px-4 flex items-center justify-between z-30 shrink-0 shadow-md">
          <span className="text-xs font-bold tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {message(language, "App.editingConfluenceDiagramFullScreen")}
          </span>
          <button
            onClick={handleConfluenceSaveAndClose}
            disabled={isSavingConfluence}
            className="px-4 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-md text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSavingConfluence ? (
              <>
                <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>{message(language, "App.saving")}</span>
              </>
            ) : (
              <span>{message(language, "App.doneSave")}</span>
            )}
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

  // Check if loading a shared URL, embed URL, or collab session
  const isShareOrEmbedUrl =
    window.location.href.includes('share=') ||
    window.location.href.includes('ref=') ||
    window.location.href.includes('embed') ||
    window.location.href.includes('collab=');

  // ── Desktop/Web Welcome Screen ──────────────────────────────────────────
  if (!currentWorkspace && viewMode !== 'import-preview' && !isForgeMode && !isDcMode && !isShareOrEmbedUrl) {
    return (
      <Suspense fallback={<LazyFallback />}>
        {isShareOrEmbedUrl && <ShareLoader />}
        {window.location.href.includes('collab=') && <CollabJoinModal />}
        <GlobalConfirmAlertModal />
        <Welcome />
      </Suspense>
    );
  }

  // ── Desktop/Web Main Application ────────────────────────────────────────
  return (
    <Suspense fallback={<LazyFallback />}>
      {isShareOrEmbedUrl && <ShareLoader />}
      {window.location.href.includes('collab=') && <CollabJoinModal />}
      <GlobalConfirmAlertModal />
      {viewMode === 'import-preview' ? (
        <ImportPreviewLayout />
      ) : isReadOnly ? (
        <SharedDiagramLayout />
      ) : currentView === 'studio' ? (
        <ComponentStudio />
      ) : (
        <div className="h-screen w-screen flex flex-col overflow-hidden relative">
          {(isForgeMode || isDcMode) && (
            <div className="h-10 bg-indigo-600 text-white px-4 flex items-center justify-between z-30 shrink-0 shadow-md font-sans">
              <span className="text-xs font-bold tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {message(language, "App.editingConfluenceDiagram")}
              </span>
              <button
                onClick={async () => {
                  await handleConfluenceSaveAndClose();
                }}
                disabled={isSavingConfluence}
                className="px-3 py-1 bg-white text-indigo-700 hover:bg-indigo-50 rounded-md text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingConfluence ? (
                  <>
                    <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>{message(language, "App.saving")}</span>
                  </>
                ) : (
                  <span>{message(language, "App.doneSave2")}</span>
                )}
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
