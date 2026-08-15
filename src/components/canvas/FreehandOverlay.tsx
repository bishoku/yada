import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { getStroke } from 'perfect-freehand';
import { useAppStore } from '../../store/useAppStore';
import { FreehandPoint, FreehandStroke } from '../../types';
import { getRoughLinePath } from './utils/roughGenerators';

/**
 * Converts a polygon stroke array from perfect-freehand into an SVG path `d` string.
 */
function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke || stroke.length === 0) return '';
  const d = stroke.reduce(
    (acc: (string | number)[], [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', stroke[0][0], stroke[0][1], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

/**
 * Computes distance from a point (px, py) to a line segment (x1, y1)-(x2, y2).
 */
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

const EMPTY_STROKES: Record<string, FreehandStroke> = {};

interface TextEditState {
  id?: string;
  x: number;
  y: number;
  text: string;
}

export const FreehandOverlay: React.FC = () => {
  const { screenToFlowPosition } = useReactFlow();
  const { x: vpX, y: vpY, zoom: vpZoom } = useViewport();

  const isReadOnly = useAppStore((s) => s.isReadOnly);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const activeDrawingTool = useAppStore((s) => s.activeDrawingTool);
  const drawingColor = useAppStore((s) => s.drawingColor);
  const drawingSize = useAppStore((s) => s.drawingSize);
  const drawingOpacity = useAppStore((s) => s.drawingOpacity);
  const rawStrokes = useAppStore((s) => s.visualData?.freehandStrokes);
  const freehandStrokes = rawStrokes || EMPTY_STROKES;
  const addFreehandStroke = useAppStore((s) => s.addFreehandStroke);
  const updateFreehandStroke = useAppStore((s) => s.updateFreehandStroke);
  const deleteFreehandStroke = useAppStore((s) => s.deleteFreehandStroke);

  const [currentPoints, setCurrentPoints] = useState<FreehandPoint[]>([]);
  const [activeTextEdit, setActiveTextEdit] = useState<TextEditState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isDrawingRef = useRef(false);

  const isDrawingActive = !!activeDrawingTool && !isReadOnly && !isPlaying;

  // Auto-focus textarea whenever text editing starts
  useEffect(() => {
    if (activeTextEdit) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTextEdit?.x, activeTextEdit?.y, activeTextEdit?.id]);

  // ── Commit Text Editing ───────────────────────────────────────────────────
  const commitTextEdit = useCallback(() => {
    if (!activeTextEdit) return;
    const trimmed = activeTextEdit.text.trim();
    if (trimmed) {
      if (activeTextEdit.id) {
        updateFreehandStroke(activeTextEdit.id, {
          text: trimmed,
          color: drawingColor,
          size: drawingSize,
          fontSize: Math.max(18, drawingSize * 5.5),
        });
      } else {
        const newStroke: FreehandStroke = {
          id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          tool: 'text',
          points: [{ x: activeTextEdit.x, y: activeTextEdit.y }],
          text: trimmed,
          color: drawingColor,
          size: drawingSize,
          fontSize: Math.max(18, drawingSize * 5.5),
          fontFamily: 'Caveat, Kalam, var(--font-sketchy), cursive, sans-serif',
          opacity: drawingOpacity,
          alwaysVisible: true,
        };
        addFreehandStroke(newStroke);
      }
    } else if (activeTextEdit.id) {
      // Empty text on existing stroke -> delete it
      deleteFreehandStroke(activeTextEdit.id);
    }
    setActiveTextEdit(null);
  }, [activeTextEdit, drawingColor, drawingSize, drawingOpacity, addFreehandStroke, updateFreehandStroke, deleteFreehandStroke]);

  // ── Render Freehand Stroke to SVG element ──────────────────────────────────
  const renderStroke = useCallback((stroke: FreehandStroke) => {
    if (!stroke.points || stroke.points.length === 0) return null;

    if (stroke.tool === 'text') {
      const lines = (stroke.text || '').split('\n');
      const fontSize = stroke.fontSize ?? Math.max(18, stroke.size * 5.5);
      const lineHeight = fontSize * 1.2;
      const startX = stroke.points[0]?.x ?? 0;
      const startY = stroke.points[0]?.y ?? 0;

      return (
        <g
          key={stroke.id}
          opacity={stroke.opacity ?? 1}
          className="select-none cursor-pointer group"
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (isDrawingActive) {
              setActiveTextEdit({
                id: stroke.id,
                x: startX,
                y: startY,
                text: stroke.text || '',
              });
            }
          }}
        >
          <text
            x={startX}
            y={startY}
            fill={stroke.color}
            fontSize={fontSize}
            fontFamily={stroke.fontFamily || 'Caveat, Kalam, var(--font-sketchy), cursive, sans-serif'}
            fontWeight="600"
            letterSpacing="0.02em"
            dominantBaseline="hanging"
          >
            {lines.map((line, idx) => (
              <tspan key={idx} x={startX} dy={idx === 0 ? 0 : lineHeight}>
                {line || ' '}
              </tspan>
            ))}
          </text>
        </g>
      );
    }

    if (stroke.tool === 'arrow') {
      if (stroke.points.length < 2) return null;
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];

      // Calculate arrow head angle
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLen = Math.max(12, stroke.size * 3.5);
      const h1x = end.x - headLen * Math.cos(angle - Math.PI / 6);
      const h1y = end.y - headLen * Math.sin(angle - Math.PI / 6);
      const h2x = end.x - headLen * Math.cos(angle + Math.PI / 6);
      const h2y = end.y - headLen * Math.sin(angle + Math.PI / 6);

      const linePath = getRoughLinePath(start.x, start.y, end.x, end.y, {
        stroke: stroke.color,
        strokeWidth: stroke.size,
        roughness: stroke.roughness ?? 1.2,
      });

      const headPath = `M ${h1x},${h1y} L ${end.x},${end.y} L ${h2x},${h2y}`;

      return (
        <g key={stroke.id} opacity={stroke.opacity ?? 1}>
          <path d={linePath} fill="none" stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" />
          <path d={headPath} fill="none" stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }

    const isHighlighter = stroke.tool === 'highlighter';
    const strokeOptions = {
      size: isHighlighter ? stroke.size * 3.5 : stroke.size * 2,
      thinning: isHighlighter ? 0.1 : 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
      last: true,
    };

    const outlinePoints = getStroke(
      stroke.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
      strokeOptions
    );

    const pathData = getSvgPathFromStroke(outlinePoints);
    if (!pathData) return null;

    return (
      <path
        key={stroke.id}
        d={pathData}
        fill={stroke.color}
        opacity={isHighlighter ? 0.35 : stroke.opacity ?? 1}
        style={{ mixBlendMode: isHighlighter ? 'multiply' : 'normal' }}
      />
    );
  }, [isDrawingActive]);

  // ── Eraser hit detection ──────────────────────────────────────────────────
  const handleEraseAt = useCallback(
    (flowX: number, flowY: number) => {
      const threshold = 18 / vpZoom;
      Object.values(freehandStrokes).forEach((stroke) => {
        if (!stroke.points || stroke.points.length === 0) return;

        if (stroke.tool === 'text') {
          const pt = stroke.points[0];
          const dist = Math.hypot(flowX - pt.x, flowY - pt.y);
          if (dist < 40 / vpZoom) {
            deleteFreehandStroke(stroke.id);
          }
          return;
        }

        for (let i = 0; i < stroke.points.length - 1; i++) {
          const p1 = stroke.points[i];
          const p2 = stroke.points[i + 1];
          if (distToSegment(flowX, flowY, p1.x, p1.y, p2.x, p2.y) < threshold) {
            deleteFreehandStroke(stroke.id);
            break;
          }
        }
      });
    },
    [freehandStrokes, deleteFreehandStroke, vpZoom]
  );

  // ── Pointer Handlers ──────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingActive) return;
      if (e.button !== 0) return;

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (activeDrawingTool === 'text') {
        if (activeTextEdit && activeTextEdit.text.trim()) {
          const trimmed = activeTextEdit.text.trim();
          if (activeTextEdit.id) {
            updateFreehandStroke(activeTextEdit.id, {
              text: trimmed,
              color: drawingColor,
              size: drawingSize,
              fontSize: Math.max(14, drawingSize * 4.5),
            });
          } else {
            addFreehandStroke({
              id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              tool: 'text',
              points: [{ x: activeTextEdit.x, y: activeTextEdit.y }],
              text: trimmed,
              color: drawingColor,
              size: drawingSize,
              fontSize: Math.max(14, drawingSize * 4.5),
              opacity: drawingOpacity,
              alwaysVisible: true,
            });
          }
        }
        setActiveTextEdit({ x: flowPos.x, y: flowPos.y, text: '' });
        return;
      }

      isDrawingRef.current = true;

      if (activeDrawingTool === 'eraser') {
        handleEraseAt(flowPos.x, flowPos.y);
        return;
      }

      setCurrentPoints([{ x: flowPos.x, y: flowPos.y, pressure: e.pressure || 0.5 }]);
    },
    [isDrawingActive, activeDrawingTool, screenToFlowPosition, handleEraseAt, activeTextEdit, drawingColor, drawingSize, drawingOpacity, addFreehandStroke, updateFreehandStroke]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current || !isDrawingActive || activeDrawingTool === 'text') return;

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (activeDrawingTool === 'eraser') {
        handleEraseAt(flowPos.x, flowPos.y);
        return;
      }

      setCurrentPoints((prev) => [
        ...prev,
        { x: flowPos.x, y: flowPos.y, pressure: e.pressure || 0.5 },
      ]);
    },
    [isDrawingActive, activeDrawingTool, screenToFlowPosition, handleEraseAt]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current || !isDrawingActive || activeDrawingTool === 'text') return;
    isDrawingRef.current = false;

    if (activeDrawingTool && activeDrawingTool !== 'eraser' && currentPoints.length > 0) {
      const newStroke: FreehandStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tool: activeDrawingTool,
        points: currentPoints,
        color: drawingColor,
        size: drawingSize,
        opacity: drawingOpacity,
        alwaysVisible: true,
      };
      addFreehandStroke(newStroke);
    }

    setCurrentPoints([]);
  }, [
    isDrawingActive,
    activeDrawingTool,
    currentPoints,
    drawingColor,
    drawingSize,
    drawingOpacity,
    addFreehandStroke,
  ]);

  // Current live preview stroke
  const livePreview = useMemo(() => {
    if (!activeDrawingTool || activeDrawingTool === 'eraser' || activeDrawingTool === 'text' || currentPoints.length === 0) return null;
    return renderStroke({
      id: 'live-preview',
      tool: activeDrawingTool,
      points: currentPoints,
      color: drawingColor,
      size: drawingSize,
      opacity: drawingOpacity,
    });
  }, [activeDrawingTool, currentPoints, drawingColor, drawingSize, drawingOpacity, renderStroke]);

  return (
    <div
      className={`absolute inset-0 w-full h-full ${
        isDrawingActive ? (activeDrawingTool === 'text' ? 'cursor-text' : 'cursor-crosshair') : 'pointer-events-none'
      }`}
      style={{
        zIndex: isDrawingActive ? 40 : 5,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* SVG Canvas transformed to React Flow coordinates */}
      <svg
        className="w-full h-full overflow-visible pointer-events-none"
        style={{
          transform: `translate(${vpX}px, ${vpY}px) scale(${vpZoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Render all saved freehand strokes */}
        {Object.values(freehandStrokes).map(renderStroke)}

        {/* Render live active drawing preview */}
        {livePreview}
      </svg>

      {/* Inline Text Editor Modal Popup */}
      {activeTextEdit && (
        <div
          className="absolute pointer-events-auto z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1.5 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-violet-500 rounded-xl shadow-2xl"
          style={{
            left: `${activeTextEdit.x * vpZoom + vpX}px`,
            top: `${activeTextEdit.y * vpZoom + vpY}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            autoFocus
            rows={2}
            value={activeTextEdit.text}
            onChange={(e) => setActiveTextEdit({ ...activeTextEdit, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitTextEdit();
              } else if (e.key === 'Escape') {
                setActiveTextEdit(null);
              }
            }}
            placeholder="Not veya etiket yazın..."
            className="bg-transparent border-0 outline-none resize-none font-[family-name:var(--font-sketchy)] font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 min-w-[200px]"
            style={{
              color: drawingColor,
              fontFamily: 'Caveat, Kalam, var(--font-sketchy), cursive',
              fontSize: `${Math.max(18, drawingSize * 5.5)}px`,
              lineHeight: 1.2,
              letterSpacing: '0.02em',
            }}
          />
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-[11px] text-slate-400">
              <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">↵</kbd> Kaydet &nbsp;
              <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Esc</kbd> İptal
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTextEdit(null)}
                className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={commitTextEdit}
                className="px-2.5 py-0.5 rounded bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-sm transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
