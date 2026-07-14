import React, { useEffect, useRef, useState } from 'react';
import { useViewport } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';

interface DragGhostProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export const DragGhost: React.FC<DragGhostProps> = ({ canvasRef }) => {
  const pendingDrop = useAppStore((state) => state.pendingDrop);
  const { x: vpX, y: vpY, zoom } = useViewport();

  // Pixel position of mouse relative to canvas wrapper
  const [canvasPos, setCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pendingDrop) {
      setCanvasPos(null);
      return;
    }

    const onMove = (e: MouseEvent) => {
      const el = canvasRef.current;
      if (!el) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        setCanvasPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      });
    };

    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pendingDrop, canvasRef]);

  if (!pendingDrop || !canvasPos) return null;

  const isSection = pendingDrop.type === 'section';
  const nodeW = isSection ? 400 : 224;
  const nodeH = isSection ? 300 : 52;

  // Convert canvas-pixel mouse position to flow coordinate
  const flowX = (canvasPos.x - vpX) / zoom;
  const flowY = (canvasPos.y - vpY) / zoom;

  // Top-left of the ghost (centered on cursor)
  const ghostLeft = flowX - nodeW / 2;
  const ghostTop = flowY - nodeH / 2;

  // Back to screen-pixel position (for absolute positioning inside canvas)
  const screenLeft = ghostLeft * zoom + vpX;
  const screenTop = ghostTop * zoom + vpY;

  const scaledW = nodeW * zoom;
  const scaledH = nodeH * zoom;

  return (
    <div
      style={{
        position: 'absolute',
        left: screenLeft,
        top: screenTop,
        width: scaledW,
        height: scaledH,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {isSection ? (
        // Section ghost: large rounded area
        <div
          style={{ width: '100%', height: '100%' }}
          className="rounded-2xl border-2 border-dashed border-indigo-500/60 bg-indigo-500/8 backdrop-blur-sm flex items-center justify-center"
        >
          <span className="text-indigo-500/80 text-xs font-bold select-none px-2 text-center">
            {pendingDrop.name}
          </span>
        </div>
      ) : (
        // Standard node ghost: pill-shaped card
        <div
          style={{ width: '100%', height: '100%' }}
          className="rounded-xl border-2 border-dashed border-indigo-500/70 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm flex items-center px-4 gap-2 shadow-lg shadow-indigo-500/10"
        >
          <div className="w-2 h-2 rounded-full bg-indigo-500/60 shrink-0" />
          <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold truncate select-none">
            {pendingDrop.name}
          </span>
        </div>
      )}
    </div>
  );
};
