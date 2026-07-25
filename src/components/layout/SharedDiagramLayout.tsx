import React, { useEffect, useRef, lazy, Suspense } from 'react';
import { SharedTopBar } from './SharedTopBar';
import { SharedPlaybackPanel } from './SharedPlaybackPanel';
import { useAppStore } from '../../store/useAppStore';
import { DiagramCanvas } from '../canvas/DiagramCanvas';

const SequenceDiagramCanvas = lazy(() => import('../sequence/SequenceDiagramCanvas').then(m => ({ default: m.SequenceDiagramCanvas })));

export const SharedDiagramLayout: React.FC = () => {
  const viewMode = useAppStore((s) => s.viewMode);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const logicalData = useAppStore((s) => s.logicalData);

  // Check if embedded inside an iframe or accessed with embed=true / mode=embed in URL
  const isEmbed = 
    window.self !== window.top || 
    window.location.href.includes('embed=true') || 
    window.location.href.includes('mode=embed') ||
    window.location.href.includes('embed=1');

  // Auto-start simulation in embed mode
  useEffect(() => {
    if (isEmbed && logicalData.sequences && logicalData.sequences.length > 0) {
      useAppStore.setState({ isPlaying: true, currentTime: 0 });
    }
  }, [isEmbed, logicalData]);

  // Background animation tick loop for embed mode
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEmbed || !isPlaying) return;

    let previousTime: number | null = null;
    const tick = (timestamp: number) => {
      if (previousTime !== null) {
        const delta = timestamp - previousTime;
        const state = useAppStore.getState();

        const schedValues = Object.values(state.schedules);
        const calcMax = schedValues.length > 0
          ? Math.max(...schedValues.map((s) => s.end + 500))
          : 2000;

        const nextTime = state.currentTime + delta * state.playbackRate;

        if (nextTime >= calcMax) {
          state.setCurrentTime(0);
          previousTime = timestamp;
        } else {
          state.setCurrentTime(nextTime);
        }
      }
      previousTime = timestamp;
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isEmbed, isPlaying]);

  // Clean Embed View Mode (Confluence style: no topbar, no timeline, auto-play, no tabs/edit)
  if (isEmbed) {
    return (
      <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300">
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {viewMode === 'freeform' ? (
            <DiagramCanvas />
          ) : (
            <Suspense fallback={
              <div className="flex items-center justify-center w-full h-full text-slate-400 dark:text-slate-600">
                <div className="animate-pulse text-sm font-medium">Loading Diagram...</div>
              </div>
            }>
              <SequenceDiagramCanvas />
            </Suspense>
          )}
        </div>
      </div>
    );
  }

  // Normal Web Share View (Standalone URL opening outside iframe)
  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300">
      
      {/* Top Bar */}
      <SharedTopBar />

      {/* Main Work Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Center Section: Canvas only */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950">
          
          {/* Canvas Workspace Area — explicit size required by React Flow */}
          <div className="flex-1 min-h-0 relative" style={{ overflow: 'hidden' }}>
            {viewMode === 'freeform' ? (
              <DiagramCanvas />
            ) : (
              <Suspense fallback={
                <div className="flex items-center justify-center w-full h-full text-slate-400 dark:text-slate-650">
                  <div className="animate-pulse text-sm font-medium">Loading Sequence Diagram...</div>
                </div>
              }>
                <SequenceDiagramCanvas />
              </Suspense>
            )}
          </div>

          {/* Simple bottom Playback Panel */}
          <SharedPlaybackPanel />
          
        </main>

      </div>
    </div>
  );
};

export default SharedDiagramLayout;
