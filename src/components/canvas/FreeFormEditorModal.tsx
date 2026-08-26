import React, { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { FreeFormContent } from '../../types';
import { Save, X, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

// Lazy load Excalidraw for bundle splitting
const ExcalidrawComponent = lazy(async () => {
  await import('@excalidraw/excalidraw/index.css');
  const mod = await import('@excalidraw/excalidraw');
  return { default: mod.Excalidraw };
});

interface FreeFormEditorModalProps {
  nodeId: string;
  nodeName: string;
  initialContent: FreeFormContent | null;
  onSave: (content: FreeFormContent) => void;
  onClose: () => void;
}

export const FreeFormEditorModal: React.FC<FreeFormEditorModalProps> = ({
  nodeId: _nodeId,
  nodeName,
  initialContent,
  onSave,
  onClose,
}) => {
  const excalidrawAPIRef = useRef<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const language = useAppStore((s: any) => s.language);
  const appTheme = useAppStore((s: any) => s.theme);

  // Map app themes to Excalidraw themes
  const excalidrawTheme = (() => {
    if (appTheme === 'light' || appTheme === 'retro') return 'light';
    return 'dark'; // dark, nord, dracula, synthwave → dark
  })();

  // Prevent body scroll when modal is open
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [hasChanges]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      const confirmMsg = language === 'tr'
        ? 'Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?'
        : 'You have unsaved changes. Are you sure you want to exit?';
      if (!window.confirm(confirmMsg)) return;
    }
    onClose();
  }, [hasChanges, onClose, language]);

  const handleSave = useCallback(async () => {
    const api = excalidrawAPIRef.current;
    if (!api) return;

    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();

    // Generate SVG preview for the node thumbnail
    let svgCache = '';
    try {
      const { exportToSvg } = await import('@excalidraw/excalidraw');
      const svgEl = await exportToSvg({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: excalidrawTheme === 'dark',
          exportBackground: false,
        },
        files,
      });
      // Clean SVG for embedding
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');
      svgEl.setAttribute('width', '100%');
      svgEl.setAttribute('height', '100%');
      svgEl.style.maxWidth = '100%';
      svgEl.style.maxHeight = '100%';
      svgCache = svgEl.outerHTML;
    } catch (err) {
      console.warn('[FreeForm] SVG export failed:', err);
    }

    const content: FreeFormContent = {
      elements: JSON.parse(JSON.stringify(elements)),
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemFontFamily: appState.currentItemFontFamily,
        gridSize: appState.gridSize,
      },
      files: files ? JSON.parse(JSON.stringify(files)) : undefined,
      svgCache,
    };

    onSave(content);
  }, [onSave, excalidrawTheme]);

  const handleChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  // Build initial data for Excalidraw
  const initialData = initialContent ? {
    elements: initialContent.elements || [],
    appState: {
      ...(initialContent.appState || {}),
      theme: excalidrawTheme as 'light' | 'dark',
    },
    files: initialContent.files || undefined,
  } : undefined;

  return (
    <div 
      className="fixed inset-0 z-[1000] flex flex-col"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative flex flex-col w-full h-full">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {nodeName}
            </span>
            {hasChanges && (
              <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">
                {language === 'tr' ? '(değişiklikler kaydedilmedi)' : '(unsaved changes)'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {language === 'tr' ? 'Kaydet' : 'Save'}
            </button>
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              {language === 'tr' ? 'Kapat' : 'Close'}
            </button>
          </div>
        </div>

        {/* Excalidraw Canvas */}
        <div className="flex-1 relative">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-white dark:bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <span className="text-sm text-slate-500">
                    {language === 'tr' ? 'Editör yükleniyor...' : 'Loading editor...'}
                  </span>
                </div>
              </div>
            }
          >
            <ExcalidrawComponent
              excalidrawAPI={(api: any) => { excalidrawAPIRef.current = api; }}
              initialData={initialData}
              theme={excalidrawTheme}
              onChange={handleChange}
              langCode={language === 'tr' ? 'tr-TR' : 'en'}
              UIOptions={{
                canvasActions: {
                  loadScene: true,
                  export: false,
                  saveToActiveFile: false,
                },
              }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

FreeFormEditorModal.displayName = 'FreeFormEditorModal';
