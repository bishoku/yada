import { editingCopy } from '../../i18n/editingCopy';
import { useCompactLayout } from './useCompactLayout';
import { PanelDrawer, type CompactPanel } from './PanelDrawer';
import { message } from '../../i18n/messages';
import { translations } from '../../i18n/translations';
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { TopBar } from './TopBar';
import { SidebarLeft } from './SidebarLeft';
import { RightSidebarShell } from '../sidebar/RightSidebarShell';
import { useAppStore } from '../../store/useAppStore';

import { DiagramCanvas } from '../canvas/DiagramCanvas';
import { DiagramTabBar } from './DiagramTabBar';
import { DiagramDashboard } from './DiagramDashboard';
import { CreateDiagramModal } from './CreateDiagramModal';
import { TimelinePanel } from './TimelinePanel';
import { Minimize } from 'lucide-react';

const SequenceDiagramCanvas = lazy(() => import('../sequence/SequenceDiagramCanvas').then(m => ({ default: m.SequenceDiagramCanvas })));

import { ChatOverlay } from '../chat/ChatOverlay';

export const MainLayout: React.FC = () => {

  const compact = useCompactLayout();
  const [compactPanel, setCompactPanel] = useState<CompactPanel | null>(null);
  const tuningOpenedFromDock = useRef(false);
  const activeNodeId = useAppStore(s => s.activeNodeProperties?.id);
  const activeEdgeId = useAppStore(s => s.activeEdgeProperties?.id);
  const closeCompactPanel = () => {
    if (compactPanel === 'properties') window.dispatchEvent(new Event('properties:cancelPreview'));
    setCompactPanel(null);
    if (tuningOpenedFromDock.current) {
      tuningOpenedFromDock.current = false;
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-playback-dock] .yada-dock-toggle')?.focus());
    }
  };
  const toggleCompactPanel = (panel: CompactPanel) => {tuningOpenedFromDock.current = false;setCompactPanel(current => current === panel ? null : panel);};
  useEffect(() => { if (compact && (activeNodeId || activeEdgeId)) setCompactPanel('properties'); }, [compact, activeNodeId, activeEdgeId]);

  useEffect(() => {
    const openLibrary = () => {
      if (compact) setCompactPanel('library');
      else if (!useAppStore.getState().leftSidebarOpen) useAppStore.getState().toggleLeftSidebar();
      requestAnimationFrame(() => window.dispatchEvent(new Event('sidebar:focusSearch')));
    };
    window.addEventListener('canvas:openLibrary', openLibrary);
    return () => window.removeEventListener('canvas:openLibrary', openLibrary);
  }, [compact]);

  const timelineHeight = useAppStore((s) => s.timelineHeight);
  const _timelineOpen = useAppStore((s) => s.timelineOpen);
  const setTimelineHeight = useAppStore((s) => s.setTimelineHeight);
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const viewMode = useAppStore((s) => s.viewMode);
  const _leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen);
  const _rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen);
  const [isResizing, setIsResizing] = useState(false);

  const isFullscreen = useAppStore((s) => s.isFullscreen);
  const exitFullscreen = useAppStore((s) => s.exitFullscreen);

  const openDiagramIds = useAppStore((s) => s.openDiagramIds);
  const activeDiagramId = useAppStore((s) => s.activeDiagramId);
  const timelineOpen = isFullscreen ? false : (_timelineOpen && openDiagramIds.length > 0);
  const leftSidebarOpen = isFullscreen ? false : _leftSidebarOpen;
  const rightSidebarOpen = isFullscreen ? false : _rightSidebarOpen;

  useEffect(() => { if (!compact || isFullscreen) setCompactPanel(null); }, [compact, isFullscreen]);

  return (
    <div className="h-dvh w-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300">

      {/* Top Bar */}
      {!isFullscreen && <TopBar compact={compact} compactPanel={compactPanel} onPanelToggle={toggleCompactPanel} />}

      {/* Floating Exit Fullscreen Button */}
      {isFullscreen && (
        <button
          onClick={exitFullscreen}
          className="absolute top-4 right-4 z-50 p-2 bg-slate-900/50 hover:bg-slate-900/80 text-white rounded-lg shadow-lg transition-all backdrop-blur-sm cursor-pointer"
          title={message(language, "MainLayout.exitFullscreen")}
        >
          <Minimize className="w-5 h-5" />
        </button>
      )}

      {/* Main Work Area */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Left Sidebar: Explorer & Library */}
        {!compact && leftSidebarOpen && <SidebarLeft />}

        {/* Center Section: Canvas & Timeline */}
        <main className="isolate flex-1 min-w-0 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950">

          {/* Diagram Tab Bar */}
          <DiagramTabBar />

          {/* Canvas Workspace Area or Dashboard */}
          {openDiagramIds.length === 0 ? (
            <DiagramDashboard />
          ) : (
            <div className="flex-1 min-h-0 relative" style={{ overflow: 'hidden' }}>
              {viewMode === 'freeform' ? (
                <DiagramCanvas />
              ) : (
                <Suspense fallback={
                  <div className="flex items-center justify-center w-full h-full text-slate-400 dark:text-slate-600">
                    <div className="animate-pulse text-sm font-medium">{t.timelineUi.loadingSequence}</div>
                  </div>
                }>
                  <SequenceDiagramCanvas />
                </Suspense>
              )}
            </div>
          )}

          {/* Resizer Splitter Bar */}
          {!compact && timelineOpen && (
            <div
              role="separator" aria-orientation="horizontal" tabIndex={0}
              aria-label={message(language, 'layout.resizeTimeline')}
              aria-valuemin={140} aria-valuemax={Math.round(window.innerHeight * 0.7)} aria-valuenow={timelineHeight}
              onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setIsResizing(true); }}
              onPointerMove={event => { if (isResizing) setTimelineHeight(Math.min(Math.max(140, window.innerHeight - event.clientY), window.innerHeight * 0.7)); }}
              onPointerUp={() => setIsResizing(false)} onPointerCancel={() => setIsResizing(false)}
              onKeyDown={event => {
                if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const max = window.innerHeight * 0.7;
                const next = event.key === 'Home' ? 140 : event.key === 'End' ? max : timelineHeight + (event.key === 'ArrowUp' ? 20 : -20);
                setTimelineHeight(Math.min(Math.max(140, next), max));
              }}
              className="h-1 bg-slate-200/60 hover:h-1.5 hover:bg-indigo-500 dark:bg-slate-800 dark:hover:bg-indigo-500 cursor-ns-resize touch-none transition-all duration-150 relative z-30 flex-shrink-0"
              title={t.timelineUi.resize}
            />
          )}

          {/* Timeline Animation Panel */}
          {activeDiagramId && (!compact || compactPanel !== 'timeline') && (
            <div
              style={{ height: !compact && timelineOpen ? timelineHeight : 'auto' }}
              className="border-t border-slate-200 dark:border-slate-800 z-10 shrink-0 select-none overflow-hidden"
            >
              <TimelinePanel forceCollapsed={isFullscreen || compact} onExpand={compact || isFullscreen ? () => {
                if (isFullscreen) {void exitFullscreen();if (!useAppStore.getState().timelineOpen) useAppStore.getState().toggleTimeline();}
                if (compact) {tuningOpenedFromDock.current = true;setCompactPanel('timeline');}
              } : undefined} />
            </div>
          )}

        </main>

        {/* Right Sidebar: Simulation Panel / Properties Panel */}
        {!compact && rightSidebarOpen && <RightSidebarShell />}

      </div>

      {compact && compactPanel && !isFullscreen && <PanelDrawer
        title={compactPanel === 'library' ? message(language, 'layout.library') : compactPanel === 'properties' ? message(language, 'layout.properties') : editingCopy[language].tuningHelp}
        onClose={closeCompactPanel}>
        {compactPanel === 'library' && <SidebarLeft onPick={() => setCompactPanel(null)} />}
        {compactPanel === 'properties' && <RightSidebarShell />}
        {compactPanel === 'timeline' && activeDiagramId && <TimelinePanel forceExpanded onCollapse={closeCompactPanel} />}
      </PanelDrawer>}

      {/* Create Diagram Name Modal */}
      <CreateDiagramModal />

      {/* AI Chat Overlay */}
      <ChatOverlay />
    </div>
  );
};

