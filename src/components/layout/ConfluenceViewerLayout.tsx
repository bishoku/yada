import React, { useEffect, useRef, lazy, Suspense, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DiagramCanvas } from '../canvas/DiagramCanvas';
import { Edit3 } from 'lucide-react';

const SequenceDiagramCanvas = lazy(() => import('../sequence/SequenceDiagramCanvas').then(m => ({ default: m.SequenceDiagramCanvas })));

interface ConfluenceViewerLayoutProps {
  onEdit?: () => void;
}

export const ConfluenceViewerLayout: React.FC<ConfluenceViewerLayoutProps> = ({ onEdit }) => {
  const viewMode = useAppStore((s) => s.viewMode);
  const language = useAppStore((s) => s.language);

  const isPlaying = useAppStore((s) => s.isPlaying);
  const logicalData = useAppStore((s) => s.logicalData);

  const isTr = language === 'tr';
  const [isHovering, setIsHovering] = useState(false);

  // Auto-start simulation whenever logicalData changes or has sequences
  useEffect(() => {
    if (logicalData.sequences && logicalData.sequences.length > 0) {
      useAppStore.setState({ isPlaying: true, currentTime: 0 });
    }
  }, [logicalData]);

  // Background playback loop to drive node status & particle animations automatically
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;

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
  }, [isPlaying]);

  return (
    <div
      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300 font-sans relative"
      style={{ height: '480px' }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Floating Edit Button — appears on hover */}
      {onEdit && (
        <div
          className="absolute top-3 right-3 z-30 transition-all duration-200"
          style={{
            opacity: isHovering ? 1 : 0,
            transform: isHovering ? 'translateY(0)' : 'translateY(-6px)',
            pointerEvents: isHovering ? 'auto' : 'none',
          }}
        >
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg backdrop-blur-sm active:scale-95 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isTr ? 'Düzenle' : 'Edit'}</span>
          </button>
        </div>
      )}

      {/* Full-Size Canvas — no header, clean diagram view */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
        {viewMode === 'freeform' ? (
          <DiagramCanvas />
        ) : (
          <Suspense fallback={
            <div className="flex items-center justify-center w-full h-full text-slate-400">
              <div className="animate-pulse text-xs font-medium">Sequence Diagram Yükleniyor...</div>
            </div>
          }>
            <SequenceDiagramCanvas />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default ConfluenceViewerLayout;
