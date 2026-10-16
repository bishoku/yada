import type { CompactPanel } from './PanelDrawer';
import { ModalSurface } from '../ui/ModalSurface';
import { useUiCopy } from '../../i18n/useUiCopy';
import { message } from '../../i18n/messages';
import { MermaidExportModal } from './topbar/MermaidExportModal';
import { getPlatformCapabilities } from '../../services/platformCapabilities';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  LogOut, Settings, Database,
  PanelLeft, PanelRight, PanelBottom,
  Undo, Redo, FileDown, Copy, ChevronDown, Save, Loader2,
  ListOrdered, LayoutDashboard, Grid, Code2,
  Cloud, CloudUpload, CheckCircle2, AlertCircle, Maximize, Minimize, Lock, MoreHorizontal
} from 'lucide-react';
import { translations } from '../../i18n/translations';
import { generateDiagramAiSummary } from '../../utils/aiSummary';
import { StorageService, isTauri } from '../../services/storage';
import { GoogleDriveService } from '../../services/googleDriveAPI';

// SOLID Subcomponents
import { SettingsModal } from './topbar/SettingsModal';
import { GifExportModal } from './topbar/GifExportModal';
import { AiCopyModal } from './topbar/AiCopyModal';
import { CanvasBgSelector } from './topbar/CanvasBgSelector';
import { ShareModal } from './topbar/ShareModal';
import { EmbedSnippetModal } from './topbar/EmbedSnippetModal';
import { StartCollabModal } from '../collab/StartCollabModal';
import { Share2, Users } from 'lucide-react';

export const TopBar: React.FC<{ compact?: boolean; compactPanel?: CompactPanel | null; onPanelToggle?: (panel: CompactPanel) => void }> = ({ compact = false, compactPanel = null, onPanelToggle }) => {
  const uiCopy = useUiCopy();
  const toolsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) toolsRef.current.open = false;
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const activeDiagramId = useAppStore((s) => s.activeDiagramId);
  const isDirty = useAppStore((s) => s.isDirty);
  const isSaving = useAppStore((s: any) => s.isSaving);
  const manualSave = useAppStore((s: any) => s.manualSave);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const language = useAppStore((s) => s.language);
  const theme = useAppStore((s) => s.theme);
  const storedLeftSidebarOpen = useAppStore((s) => s.leftSidebarOpen);
  const storedRightSidebarOpen = useAppStore((s) => s.rightSidebarOpen);
  const storedToggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar);
  const storedToggleRightSidebar = useAppStore((s) => s.toggleRightSidebar);
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const currentView = useAppStore((s) => s.currentView);
  const libraryComponents = useAppStore((s) => s.libraryComponents);
  const applyAutoLayout = useAppStore((s) => s.applyAutoLayout);
  const pastStates = useAppStore((s) => s.pastStates);
  const futureStates = useAppStore((s) => s.futureStates);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const storedTimelineOpen = useAppStore((s) => s.timelineOpen);
  const storedToggleTimeline = useAppStore((s) => s.toggleTimeline);
  const leftSidebarOpen = compact ? compactPanel === 'library' : storedLeftSidebarOpen;
  const rightSidebarOpen = compact ? compactPanel === 'properties' : storedRightSidebarOpen;
  const timelineOpen = compact ? compactPanel === 'timeline' : storedTimelineOpen;
  const toggleLeftSidebar = () => compact ? onPanelToggle?.('library') : storedToggleLeftSidebar();
  const toggleRightSidebar = () => compact ? onPanelToggle?.('properties') : storedToggleRightSidebar();
  const toggleTimeline = () => compact ? onPanelToggle?.('timeline') : storedToggleTimeline();


  const viewMode = useAppStore((s) => s.viewMode);
  const openAlert = useAppStore((s) => s.openAlert);
  const toggleViewMode = useAppStore((s) => s.toggleViewMode);
  const isReadOnly = useAppStore((s) => s.isReadOnly);

  // Google Sync State
  const googleUser = useAppStore((s) => s.googleUser);
  const syncState = useAppStore((s) => s.syncState);
  const hasUnsyncedChanges = useAppStore((s) => s.hasUnsyncedChanges);

  const { canCollaborate } = getPlatformCapabilities();

  // Collab State
  const isCollabActive = useAppStore((s) => s.isCollabActive);
  const setStartCollabModalOpen = useAppStore((s) => s.setStartCollabModalOpen);

  const t = translations[language];

  const [showSettings, setShowSettings] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMermaidExport, setShowMermaidExport] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  // Export Config State (shared modal for GIF + Video)
  const [showExportConfig, setShowExportConfig] = useState(false);
  const [exportMode, setExportMode] = useState<'gif' | 'video'>('gif');

  // AI Copy Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiText, setAiText] = useState('');

  const isFullscreen = useAppStore((s) => s.isFullscreen);
  const toggleFullscreen = useAppStore((s) => s.toggleFullscreen);

  const handleBackToWelcome = () => {
    setWorkspace(null);
  };

  const layoutPending = useRef(false);
  const handleAutoLayout = async (direction: 'TB' | 'LR') => {
    if (layoutPending.current) return;
    layoutPending.current = true;
    setShowLayoutMenu(false);
    try { await applyAutoLayout(direction); }
    catch { openAlert({ title: message(language, 'TopBar.error'), message: message(language, 'TopBar.layoutLoadError') }); }
    finally { layoutPending.current = false; }
  };

  const handleExportHtml = async () => {
    try {
      const defaultName = `${currentWorkspace?.name || 'diagram'}_simulation.html`;

      const htmlContent = viewMode === 'sequence'
        ? (await import('../../utils/exportSequenceTemplate')).generateSequenceHtml(logicalData, useAppStore.getState().schedules, visualData.timelines, theme === 'light' ? 'light' : 'dark', language)
        : (await import('../../utils/exportTemplate')).generateStandaloneHtml(logicalData, visualData, libraryComponents, language);

      if (isTauri()) {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const selectedPath = await save({
          title: message(language, "TopBar.saveStandaloneHTMLSimulation"),
          defaultPath: defaultName,
          filters: [{ name: 'HTML', extensions: ['html'] }],
        });

        if (!selectedPath) return;
        await StorageService.save_text_file(selectedPath, htmlContent);
      } else {
        // Web Implementation: Download via Blob
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
      }
      openAlert({
        title: message(language, "TopBar.success"),
        message: message(language, "TopBar.hTMLSimulationExportedSuccessfully")
      });
    } catch (err) {
      console.error('Error exporting HTML:', err);
      openAlert({
        title: message(language, "TopBar.error"),
        message: message(language, "TopBar.exportError", { value1: err })
      });
    }
  };

  const handleExportPng = async () => {
    try {
      const defaultName = `${currentWorkspace?.name || 'diagram'}.png`;
      await (await import('../../utils/exportMedia')).exportToPng('.react-flow', defaultName, language);
    } catch (err) {
      console.error('Error exporting PNG:', err);
      openAlert({
        title: message(language, "TopBar.error"),
        message: message(language, "TopBar.pNGExportError", { value1: err })
      });
    }
  };

  const handleExportSvg = async () => {
    try {
      const defaultName = `${currentWorkspace?.name || 'diagram'}.svg`;
      await (await import('../../utils/exportMedia')).exportToSvg('.react-flow', defaultName, language);
    } catch (err) {
      console.error('Error exporting SVG:', err);
      openAlert({
        title: message(language, "TopBar.error"),
        message: message(language, "TopBar.sVGExportError", { value1: err })
      });
    }
  };

  const handleExportGif = async (
    fps: number,
    quality: number,
    scale: number
  ) => {
    try {
      setExportMode('gif');
      setExportProgress(0);
      const defaultName = `${currentWorkspace?.name || 'diagram'}.gif`;
      const schedules = useAppStore.getState().schedules as Record<string, { start: number, end: number }>;
      const schedValues = Object.values(schedules);
      const maxDuration = schedValues.length > 0 ? Math.max(...schedValues.map(s => s.end)) + 500 : 2000;

      await (await import('../../utils/exportMedia')).exportToGif(
        '.react-flow', maxDuration, defaultName, language,
        fps, quality, scale,
        (progress) => setExportProgress(progress)
      );
    } catch (err) {
      console.error('Error exporting GIF:', err);
      openAlert({
        title: message(language, "TopBar.error"),
        message: message(language, "TopBar.gIFExportError", { value1: err })
      });
    } finally {
      setExportProgress(null);
    }
  };

  const handleExportVideo = async (
    fps: number,
    quality: 'low' | 'medium' | 'high',
    scale: number = 1,
    mode: 'canvas' | 'screen' = 'canvas'
  ) => {
    try {
      setExportMode('video');
      setExportProgress(0);
      const defaultName = `${currentWorkspace?.name || 'diagram'}.${mode === 'screen' ? 'webm' : 'mp4'}`;
      const schedules = useAppStore.getState().schedules as Record<string, { start: number, end: number }>;
      const schedValues = Object.values(schedules);
      const maxDuration = schedValues.length > 0 ? Math.max(...schedValues.map(s => s.end)) + 500 : 2000;

      if (mode === 'screen') {
        const { exportToVideoScreenCapture } = await import('../../utils/exportMedia');
        await exportToVideoScreenCapture(
          '.react-flow', maxDuration, defaultName, language,
          fps, quality,
          (progress) => setExportProgress(progress)
        );
      } else {
        await (await import('../../utils/exportMedia')).exportToVideo(
          '.react-flow', maxDuration, defaultName, language,
          fps, quality,
          (progress) => setExportProgress(progress),
          scale
        );
      }
    } catch (err) {
      console.error('Error exporting Video:', err);
      openAlert({
        title: message(language, "TopBar.error"),
        message: message(language, "TopBar.videoExportError", { value1: err })
      });
    } finally {
      setExportProgress(null);
    }
  };

  const handleCopyForAi = async () => {
    const text = generateDiagramAiSummary(logicalData, visualData, language, libraryComponents);
    setAiText(text);
    setShowAiModal(true);
  };

  const isEmbedMode =
    window.location.href.includes('embed=true') ||
    window.location.href.includes('embed=1') ||
    window.location.href.includes('mode=modal') ||
    window.location.href.includes('mode=embed') ||
    window.location.href.includes('integration=iframe') ||
    window.location.href.includes('embed_editor=true');

  return (
    <header className="yada-topbar h-11 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-3 z-25 select-none shrink-0 transition-colors duration-300 font-sans gap-2">

      {/* ── Left Section ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Logo */}
        <button type="button"
          onClick={
            !isEmbedMode
              ? () => {
                  if (isCollabActive) {
                    openAlert({
                      title: message(language, "TopBar.collaborationActive"),
                      message:
                        message(language, "TopBar.youAreCurrentlyInALiveCollaboration"),
                    });
                    return;
                  }
                  handleBackToWelcome();
                }
              : undefined
          }
          className={`flex items-center gap-1.5 ${!isEmbedMode ? 'cursor-pointer group' : ''} shrink-0`}
          title={isEmbedMode ? message(language, 'TopBar.editor') : (message(language, "TopBar.goBackToWelcomeScreen"))}
        >
          <img src="pwa-icon.png" alt="YADA" className="h-6 w-6 transition-transform group-hover:scale-105" />
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-200 bg-clip-text text-transparent hidden lg:inline">
            {t.welcomeTitle}
          </span>
        </button>

        {!isEmbedMode && <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />}

        {/* Workspace pill */}
        {!isEmbedMode && (
          <button type="button" aria-label={message(language, 'layout.workspaceSettings')}
            className={`hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 transition-colors group ${
              isCollabActive ? 'cursor-default' : 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
            }`}
            title={
              isCollabActive
                ? (message(language, "TopBar.workspaceIsLockedDuringCollaboration"))
                : currentWorkspace?.path
            }
            onClick={() => {
              if (isCollabActive) return;
              setShowSettings(true);
            }}
          >
            {isCollabActive ? (
              <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            ) : (
              <Database className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            )}
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 max-w-[80px] truncate hidden md:inline">
              {currentWorkspace?.name}
            </span>
            {!isCollabActive && (
              <Settings className="w-3 h-3 text-slate-400 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
            )}
          </button>
        )}

        {/* Save status – tiny dot only on small, full pill on md+ */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isSaving ? (
            <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
          ) : isDirty ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold hidden md:inline">
                {message(language, "TopBar.unsaved")}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); manualSave(); }}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                title={message(language, "TopBar.saveNow")}
              >
                <Save className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold hidden md:inline">
                {message(language, "TopBar.saved")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Center Section: View Switcher ── */}
      <div className="flex-1 flex justify-center min-w-0">
        {activeDiagramId && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg select-none">
            <button
              aria-pressed={viewMode === 'freeform'} onClick={() => viewMode !== 'freeform' && toggleViewMode()}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                viewMode === 'freeform'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={message(language, "TopBar.freeStyleView")}
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">{message(language, "TopBar.freeStyle")}</span>
            </button>
            <button
              aria-pressed={viewMode === 'sequence'} onClick={() => viewMode !== 'sequence' && toggleViewMode()}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                viewMode === 'sequence'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={t.terms.sequenceDiagram}
            >
              <ListOrdered className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">{t.terms.sequenceDiagram}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Right Section ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Panel toggles */}
        {activeDiagramId && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
            <button
              onClick={toggleLeftSidebar} aria-expanded={leftSidebarOpen}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${leftSidebarOpen
                ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={message(language, "TopBar.leftPanel")}
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleTimeline} aria-expanded={timelineOpen}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${timelineOpen
                ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={t.terms.timeline}
            >
              <PanelBottom className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleRightSidebar} aria-expanded={rightSidebarOpen}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${rightSidebarOpen
                ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={message(language, "TopBar.rightPanel")}
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-md cursor-pointer transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
              title={message(language, "TopBar.fullscreen")}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        <details ref={toolsRef} className="relative yada-tools" onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
        }}>
          <summary className="yada-icon-button list-none cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={message(language, 'layout.moreTools')} title={message(language, 'layout.moreTools')}>
            <MoreHorizontal size={20} />
          </summary>
          <div className="yada-tools-content absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-xl flex flex-col gap-3">
            {activeDiagramId && currentView === 'diagram' && !isReadOnly && <>
            <CanvasBgSelector />

            {/* Undo / Redo */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              <button
                onClick={undo}
                disabled={pastStates.length === 0}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={message(language, "TopBar.undoCtrlZ")}
              >
                <Undo className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">{message(language, "TopBar.undoCtrlZ")}</span></button>
              <button
                onClick={redo}
                disabled={futureStates.length === 0}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={message(language, "TopBar.redoCtrlY")}
              >
                <Redo className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">{message(language, "TopBar.redoCtrlY")}</span></button>
            </div>

            {/* Layout dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer transition-colors"
                title={message(language, "TopBar.autoLayout")}
              >
                <Grid className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">{message(language, "TopBar.autoLayout")}</span></button>

              {showLayoutMenu && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                  <button
                    onClick={() => { void handleAutoLayout('TB'); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {message(language, "TopBar.topToBottom")}
                  </button>
                  <button
                    onClick={() => { void handleAutoLayout('LR'); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {message(language, "TopBar.leftToRight")}
                  </button>
                </div>
              )}
            </div>

            {/* Copy for AI */}
            <button
              onClick={handleCopyForAi}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer transition-colors"
              title={message(language, "TopBar.copyForAI")}
            >
              <Copy className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{message(language, "TopBar.copyForAI")}</span></button>

            <div className="hidden lg:block h-4 w-px bg-slate-200 dark:bg-slate-800" />

            </>}
            {!isEmbedMode && <button onClick={() => setShowSettings(true)} className="yada-menu-action"><Settings size={16} />{message(language, 'layout.workspaceSettings')}</button>}
            {canCollaborate && !isReadOnly && !isEmbedMode && <button onClick={() => setStartCollabModalOpen(true)} className="yada-menu-action"><Users size={16} />{message(language, 'TopBar.liveCollaborationP2P')}</button>}
            {!isEmbedMode && <button onClick={handleBackToWelcome} className="yada-menu-action"><LogOut size={16} />{t.close}</button>}
          </div>
        </details>

        {/* Freeform-only controls */}
        {activeDiagramId && currentView === 'diagram' && !isReadOnly && (
          <>
            {/* Export & Share */}
            {!isEmbedMode && (
              <div className="relative">
                <button
                  onClick={() => { if (toolsRef.current) toolsRef.current.open = false; setShowExportMenu(!showExportMenu); }}
                  className="flex items-center gap-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs cursor-pointer font-semibold transition-all"
                  title={message(language, "TopBar.exportShare")}
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{message(language, "TopBar.export")}</span>
                  <ChevronDown className="w-3 h-3 opacity-80" />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                    <button onClick={() => { setShowMermaidExport(true); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer">
                      {t.mermaid.exportLabel}
                    </button>
                    <button
                      onClick={() => { handleExportPng(); setShowExportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center justify-between"
                    >
                      <span>{message(language, "TopBar.imagePNG")}</span>
                      <span className="text-[9px] text-slate-400 font-normal">{message(language, "TopBar.embeddedData")}</span>
                    </button>
                    <button
                      onClick={() => { handleExportSvg(); setShowExportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center justify-between"
                    >
                      <span>{message(language, "TopBar.vectorSVG")}</span>
                      <span className="text-[9px] text-slate-400 font-normal">{message(language, "TopBar.embeddedData")}</span>
                    </button>
                    <button
                      onClick={() => { setShowExportConfig(true); setShowExportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center justify-between"
                    >
                      {message(language, "TopBar.animationGIFVideo")}
                      <span className="text-[9px] bg-violet-500/10 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-md font-bold">{message(language, "TopBar.new")}</span>
                    </button>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                    <button
                      onClick={() => { handleExportHtml(); setShowExportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                    >
                      {message(language, "TopBar.interactivePlayerHTML")}
                    </button>

                    {!isReadOnly && (
                      <>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                        <button
                          onClick={() => { setShowEmbedModal(true); setShowExportMenu(false); }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Code2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            {message(language, "TopBar.iframeEmbedCode")}
                          </span>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold">{message(language, "TopBar.new")}</span>
                        </button>
                        <button
                          onClick={() => { setShowShareModal(true); setShowExportMenu(false); }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-2"
                        >
                          <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          {message(language, "TopBar.shareDiagramURL")}
                        </button>
                        {canCollaborate && <button
                          onClick={() => { setStartCollabModalOpen(true); setShowExportMenu(false); }}
                          className="w-full text-left px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold cursor-pointer flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-blue-500" />
                            {message(language, "TopBar.liveCollaborationP2P")}
                          </span>
                          <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-bold">{uiCopy.upTo4People}</span>
                        </button>}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {canCollaborate && !isReadOnly && !isEmbedMode && (
          <button
            onClick={() => setStartCollabModalOpen(true)}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all shadow-sm active:scale-95 ${
              isCollabActive
                ? 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60'
            }`}
            title={message(language, "TopBar.startLiveCollaborationFigmaStyleP2P")}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {isCollabActive
                ? (message(language, "TopBar.liveActive"))
                : (message(language, "TopBar.liveCollab"))}
            </span>
          </button>
        )}

        <div className="hidden lg:block h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Google Drive */}
        {import.meta.env.VITE_ENABLE_GOOGLE_SYNC === 'true' && (
          !googleUser ? (
            <button
              onClick={() => GoogleDriveService.signIn()}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
              title={message(language, "TopBar.loginWithGoogle")}
            >
              <Cloud className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => GoogleDriveService.uploadToDrive()}
              disabled={syncState === 'syncing' || (!hasUnsyncedChanges && syncState !== 'error')}
              className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs cursor-pointer font-semibold transition-colors border ${
                syncState === 'syncing'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                  : syncState === 'error'
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50'
                  : hasUnsyncedChanges
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800/50'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 cursor-default opacity-80'
              }`}
              title={
                syncState === 'syncing' ? message(language, 'TopBar.syncing') :
                syncState === 'error' ? message(language, 'TopBar.retry') :
                hasUnsyncedChanges ? message(language, 'TopBar.push') :
                message(language, 'TopBar.synced')
              }
            >
              {syncState === 'syncing' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : syncState === 'error' ? (
                <AlertCircle className="w-3 h-3" />
              ) : hasUnsyncedChanges ? (
                <CloudUpload className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              <span className="hidden xl:inline">
                {syncState === 'syncing' ? message(language, 'TopBar.syncing') :
                 syncState === 'error' ? message(language, 'TopBar.retry') :
                 hasUnsyncedChanges ? message(language, 'TopBar.push') :
                 message(language, 'TopBar.synced')}
              </span>
            </button>
          )
        )}

        {/* Close */}
        <button
          onClick={handleBackToWelcome}
          className="hidden lg:inline-flex p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition-colors"
          title={t.close}
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Export Progress Modal */}
      {exportProgress !== null && createPortal(
        <ModalSurface label={t.commonUi.loading} onClose={() => {}} width="24rem" dismissible={false}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
            <Loader2 className={`w-12 h-12 animate-spin mb-6 ${exportMode === 'video' ? 'text-violet-500' : 'text-indigo-500'}`} />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 text-center">
              {exportMode === 'video'
                ? (message(language, "TopBar.generatingVideo"))
                : (message(language, "TopBar.generatingGIF"))}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
              {exportMode === 'video'
                ? (message(language, "TopBar.pleaseWaitFramesAreCapturedAndEncoded"))
                : (message(language, "TopBar.pleaseWaitFramesAreBeingRenderedAnd"))}
            </p>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-2 overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className={`h-3 rounded-full transition-all duration-300 ease-out ${exportMode === 'video' ? 'bg-violet-500' : 'bg-indigo-500'}`}
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className={`text-xs font-bold ${exportMode === 'video' ? 'text-violet-600 dark:text-violet-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {exportProgress}%
            </div>
          </div>
        </ModalSurface>,
        document.body
      )}

      {/* Animated Export Settings Modal (GIF + Video) */}
      <GifExportModal
        isOpen={showExportConfig}
        onClose={() => setShowExportConfig(false)}
        onExportGif={handleExportGif}
        onExportVideo={handleExportVideo}
      />

      {/* AI Copy Modal */}
      <AiCopyModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        aiText={aiText}
        setAiText={setAiText}
      />

      {showShareModal && (
        <ShareModal onClose={() => setShowShareModal(false)} />
      )}

      {showEmbedModal && (
        <EmbedSnippetModal onClose={() => setShowEmbedModal(false)} />
      )}

      {showMermaidExport && <MermaidExportModal onClose={() => setShowMermaidExport(false)} />}
      <StartCollabModal />
    </header>
  );
};
