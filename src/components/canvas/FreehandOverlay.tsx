import React, { useCallback, useRef, useState, useMemo, useEffect, memo } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { getStroke } from 'perfect-freehand';
import { useAppStore } from '../../store/useAppStore';
import { FreehandPoint, FreehandStroke } from '../../types';
import { 
  getRoughLinePath, 
  getRoughArrowPaths, 
  getRoughRectanglePaths, 
  getRoughEllipsePaths, 
  getRoughDiamondPaths,
  getNumericSeed,
} from './utils/roughGenerators';

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

/**
 * Computes the bounding box of a stroke or shape.
 */
function getStrokeBounds(stroke: FreehandStroke): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (!stroke.points || stroke.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  if (stroke.tool === 'text') {
    const fontSize = stroke.fontSize ?? Math.max(18, stroke.size * 5.5);
    const lines = (stroke.text || '').split('\n');
    const startX = stroke.points[0]?.x ?? 0;
    const startY = stroke.points[0]?.y ?? 0;
    const maxLineLen = Math.max(...lines.map((l) => l.length), 1);
    const w = Math.max(40, maxLineLen * (fontSize * 0.58));
    const h = Math.max(fontSize, lines.length * (fontSize * 1.25));
    return { minX: startX, minY: startY, maxX: startX + w, maxY: startY + h, width: w, height: h };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of stroke.points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  const w = Math.max(8, maxX - minX);
  const h = Math.max(8, maxY - minY);
  return { minX, minY, maxX, maxY, width: w, height: h };
}

const EMPTY_STROKES: Record<string, FreehandStroke> = {};

interface TextEditState {
  id?: string;
  x: number;
  y: number;
  text: string;
}

/**
 * Deterministic, memoized renderer for a single freehand stroke/shape.
 * Using seed derived from stroke.id prevents flickering on canvas re-renders.
 */
const SingleStrokeElement = memo<{
  stroke: FreehandStroke;
  isEditing?: boolean;
  onDoubleClick?: (e: React.MouseEvent) => void;
}>(({ stroke, isEditing, onDoubleClick }) => {
  if (!stroke.points || stroke.points.length === 0) return null;
  const seed = getNumericSeed(stroke.id);

  // 1. Text
  if (stroke.tool === 'text') {
    if (isEditing) return null;
    const lines = (stroke.text || '').split('\n');
    const fontSize = stroke.fontSize ?? Math.max(18, stroke.size * 5.5);
    const lineHeight = fontSize * 1.25;
    const startX = stroke.points[0]?.x ?? 0;
    const startY = stroke.points[0]?.y ?? 0;

    return (
      <g
        opacity={stroke.opacity ?? 1}
        className="select-none cursor-pointer"
        onDoubleClick={onDoubleClick}
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

  // 2. Rectangle
  if (stroke.tool === 'rectangle') {
    if (stroke.points.length < 2) return null;
    const p1 = stroke.points[0];
    const p2 = stroke.points[stroke.points.length - 1];
    const minX = Math.min(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const width = Math.max(4, Math.abs(p2.x - p1.x));
    const height = Math.max(4, Math.abs(p2.y - p1.y));

    const paths = getRoughRectanglePaths(minX, minY, width, height, {
      stroke: stroke.color,
      strokeWidth: stroke.size,
      roughness: stroke.roughness ?? 1.2,
      seed,
    });

    return (
      <g opacity={stroke.opacity ?? 1} onDoubleClick={onDoubleClick}>
        {paths.strokePath && (
          <path d={paths.strokePath} fill="none" stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </g>
    );
  }

  // 3. Ellipse / Circle
  if (stroke.tool === 'ellipse') {
    if (stroke.points.length < 2) return null;
    const p1 = stroke.points[0];
    const p2 = stroke.points[stroke.points.length - 1];
    const minX = Math.min(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const width = Math.max(4, Math.abs(p2.x - p1.x));
    const height = Math.max(4, Math.abs(p2.y - p1.y));

    const paths = getRoughEllipsePaths(minX, minY, width, height, {
      stroke: stroke.color,
      strokeWidth: stroke.size,
      roughness: stroke.roughness ?? 1.2,
      seed,
    });

    return (
      <g opacity={stroke.opacity ?? 1} onDoubleClick={onDoubleClick}>
        {paths.strokePath && (
          <path d={paths.strokePath} fill="none" stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" />
        )}
      </g>
    );
  }

  // 4. Diamond
  if (stroke.tool === 'diamond') {
    if (stroke.points.length < 2) return null;
    const p1 = stroke.points[0];
    const p2 = stroke.points[stroke.points.length - 1];
    const minX = Math.min(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const width = Math.max(4, Math.abs(p2.x - p1.x));
    const height = Math.max(4, Math.abs(p2.y - p1.y));

    const paths = getRoughDiamondPaths(minX, minY, width, height, {
      stroke: stroke.color,
      strokeWidth: stroke.size,
      roughness: stroke.roughness ?? 1.2,
      seed,
    });

    return (
      <g opacity={stroke.opacity ?? 1} onDoubleClick={onDoubleClick}>
        {paths.strokePath && (
          <path d={paths.strokePath} fill="none" stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </g>
    );
  }

  // 5. Straight Line
  if (stroke.tool === 'line') {
    if (stroke.points.length < 2) return null;
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];

    const linePath = getRoughLinePath(start.x, start.y, end.x, end.y, {
      stroke: stroke.color,
      strokeWidth: stroke.size,
      roughness: stroke.roughness ?? 1.2,
      seed,
    });

    return (
      <g opacity={stroke.opacity ?? 1} onDoubleClick={onDoubleClick}>
        <path d={linePath} fill="none" stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" />
      </g>
    );
  }

  // 6. Arrow
  if (stroke.tool === 'arrow') {
    if (stroke.points.length < 2) return null;
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];

    const { linePath, headPath } = getRoughArrowPaths(start.x, start.y, end.x, end.y, {
      stroke: stroke.color,
      strokeWidth: stroke.size,
      roughness: stroke.roughness ?? 1.2,
      seed,
    });

    return (
      <g opacity={stroke.opacity ?? 1} onDoubleClick={onDoubleClick}>
        <path d={linePath} fill="none" stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" />
        <path d={headPath} fill={stroke.color} stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }

  // 7. Freehand Pen / Highlighter
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
      d={pathData}
      fill={stroke.color}
      opacity={isHighlighter ? 0.35 : stroke.opacity ?? 1}
      style={{ mixBlendMode: isHighlighter ? 'multiply' : 'normal' }}
      onDoubleClick={onDoubleClick}
    />
  );
});

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
  const pushToHistory = useAppStore((s) => s.pushToHistory);

  const [currentPoints, setCurrentPoints] = useState<FreehandPoint[]>([]);
  const [activeTextEdit, setActiveTextEdit] = useState<TextEditState | null>(null);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    startFlowX: number;
    startFlowY: number;
    origPoints: FreehandPoint[];
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textOpenedAtRef = useRef<number>(0);
  const isDrawingRef = useRef(false);

  const isDrawingActive = !!activeDrawingTool && !isReadOnly && !isPlaying;

  // Auto-focus and adjust size of textarea
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

  // Handle keyboard shortcuts (Delete / Backspace / Escape)
  useEffect(() => {
    if (!isDrawingActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in text editor
      if (activeTextEdit) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStrokeId) {
        e.preventDefault();
        deleteFreehandStroke(selectedStrokeId);
        setSelectedStrokeId(null);
      } else if (e.key === 'Escape') {
        setSelectedStrokeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingActive, activeTextEdit, selectedStrokeId, deleteFreehandStroke]);

  // ── Commit Text Editing ───────────────────────────────────────────────────
  const commitTextEdit = useCallback(() => {
    if (!activeTextEdit) return;
    const trimmed = activeTextEdit.text.trim();
    if (trimmed) {
      if (activeTextEdit.id) {
        updateFreehandStroke(activeTextEdit.id, {
          text: trimmed,
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
        setSelectedStrokeId(newStroke.id);
      }
    } else if (activeTextEdit.id) {
      deleteFreehandStroke(activeTextEdit.id);
      if (selectedStrokeId === activeTextEdit.id) setSelectedStrokeId(null);
    }
    setActiveTextEdit(null);
  }, [activeTextEdit, drawingColor, drawingSize, drawingOpacity, addFreehandStroke, updateFreehandStroke, deleteFreehandStroke, selectedStrokeId]);

  // ── Hit Detection for Select & Eraser ──────────────────────────────────────
  const findStrokeAtPosition = useCallback(
    (flowX: number, flowY: number): string | null => {
      const threshold = 18 / vpZoom;
      const strokeList = Object.values(freehandStrokes);

      // Iterate in reverse to select top-most stroke first
      for (let sIdx = strokeList.length - 1; sIdx >= 0; sIdx--) {
        const stroke = strokeList[sIdx];
        if (!stroke.points || stroke.points.length === 0) continue;

        const bounds = getStrokeBounds(stroke);

        // Check bounding box first
        if (
          flowX >= bounds.minX - threshold &&
          flowX <= bounds.maxX + threshold &&
          flowY >= bounds.minY - threshold &&
          flowY <= bounds.maxY + threshold
        ) {
          if (stroke.tool === 'text' || stroke.tool === 'rectangle' || stroke.tool === 'ellipse' || stroke.tool === 'diamond') {
            return stroke.id;
          }

          // For lines and paths, verify distance to segments
          for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i + 1];
            if (distToSegment(flowX, flowY, p1.x, p1.y, p2.x, p2.y) < threshold) {
              return stroke.id;
            }
          }

          if (stroke.points.length === 1) {
            const pt = stroke.points[0];
            if (Math.hypot(flowX - pt.x, flowY - pt.y) < threshold * 2) {
              return stroke.id;
            }
          }
        }
      }

      return null;
    },
    [freehandStrokes, vpZoom]
  );

  // ── Eraser hit detection ──────────────────────────────────────────────────
  const handleEraseAt = useCallback(
    (flowX: number, flowY: number) => {
      const hitId = findStrokeAtPosition(flowX, flowY);
      if (hitId) {
        deleteFreehandStroke(hitId);
        if (selectedStrokeId === hitId) setSelectedStrokeId(null);
      }
    },
    [findStrokeAtPosition, deleteFreehandStroke, selectedStrokeId]
  );

  // ── Pointer Handlers ──────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingActive) return;
      if (e.button !== 0) return;

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      // 1. Text Tool -> Open in-place text editor
      if (activeDrawingTool === 'text') {
        if (activeTextEdit && activeTextEdit.text.trim()) {
          commitTextEdit();
        }
        textOpenedAtRef.current = Date.now();
        setActiveTextEdit({ x: flowPos.x, y: flowPos.y, text: '' });
        return;
      }

      // 2. Select Mode -> Select & Drag element
      if (activeDrawingTool === 'select') {
        const hitId = findStrokeAtPosition(flowPos.x, flowPos.y);
        if (hitId) {
          setSelectedStrokeId(hitId);
          const stroke = freehandStrokes[hitId];
          if (stroke) {
            setDragState({
              startFlowX: flowPos.x,
              startFlowY: flowPos.y,
              origPoints: JSON.parse(JSON.stringify(stroke.points)),
            });
          }
        } else {
          setSelectedStrokeId(null);
          setDragState(null);
        }
        return;
      }

      // 3. Eraser Tool
      if (activeDrawingTool === 'eraser') {
        isDrawingRef.current = true;
        handleEraseAt(flowPos.x, flowPos.y);
        return;
      }

      // 4. Shape & Pen Tools -> Start Drawing
      isDrawingRef.current = true;
      setSelectedStrokeId(null);

      const isShape = ['rectangle', 'ellipse', 'diamond', 'line', 'arrow'].includes(activeDrawingTool);
      if (isShape) {
        setCurrentPoints([
          { x: flowPos.x, y: flowPos.y },
          { x: flowPos.x, y: flowPos.y },
        ]);
      } else {
        // Pen / Highlighter
        setCurrentPoints([{ x: flowPos.x, y: flowPos.y, pressure: e.pressure || 0.5 }]);
      }
    },
    [isDrawingActive, activeDrawingTool, screenToFlowPosition, activeTextEdit, commitTextEdit, findStrokeAtPosition, freehandStrokes, handleEraseAt]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingActive) return;
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      // Drag & Move in Select mode
      if (activeDrawingTool === 'select' && dragState && selectedStrokeId) {
        const dx = flowPos.x - dragState.startFlowX;
        const dy = flowPos.y - dragState.startFlowY;
        const updatedPoints = dragState.origPoints.map((pt) => ({
          ...pt,
          x: pt.x + dx,
          y: pt.y + dy,
        }));
        updateFreehandStroke(selectedStrokeId, { points: updatedPoints });
        return;
      }

      if (!isDrawingRef.current) return;

      if (activeDrawingTool === 'eraser') {
        handleEraseAt(flowPos.x, flowPos.y);
        return;
      }

      const isShape = ['rectangle', 'ellipse', 'diamond', 'line', 'arrow'].includes(activeDrawingTool);
      if (isShape) {
        setCurrentPoints((prev) => {
          if (prev.length < 1) return [{ x: flowPos.x, y: flowPos.y }, { x: flowPos.x, y: flowPos.y }];
          return [prev[0], { x: flowPos.x, y: flowPos.y }];
        });
      } else {
        // Pen / Highlighter
        setCurrentPoints((prev) => [
          ...prev,
          { x: flowPos.x, y: flowPos.y, pressure: e.pressure || 0.5 },
        ]);
      }
    },
    [isDrawingActive, activeDrawingTool, screenToFlowPosition, dragState, selectedStrokeId, updateFreehandStroke, handleEraseAt]
  );

  const handlePointerUp = useCallback(() => {
    // Commit Drag in Select mode
    if (activeDrawingTool === 'select' && dragState) {
      pushToHistory();
      setDragState(null);
      return;
    }

    if (!isDrawingRef.current || !isDrawingActive || activeDrawingTool === 'text') return;
    isDrawingRef.current = false;

    if (activeDrawingTool && activeDrawingTool !== 'eraser' && currentPoints.length > 0) {
      const isShape = ['rectangle', 'ellipse', 'diamond', 'line', 'arrow'].includes(activeDrawingTool);
      const minDistance = isShape ? 6 : 2;
      const p1 = currentPoints[0];
      const p2 = currentPoints[currentPoints.length - 1];

      if (Math.hypot(p2.x - p1.x, p2.y - p1.y) >= minDistance || currentPoints.length > 2) {
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
        setSelectedStrokeId(newStroke.id);
      }
    }

    setCurrentPoints([]);
  }, [
    activeDrawingTool,
    dragState,
    isDrawingActive,
    currentPoints,
    drawingColor,
    drawingSize,
    drawingOpacity,
    pushToHistory,
    addFreehandStroke,
  ]);

  // Live drawing preview with fixed preview seed (no jitter)
  const livePreview = useMemo(() => {
    if (!activeDrawingTool || activeDrawingTool === 'eraser' || activeDrawingTool === 'text' || activeDrawingTool === 'select' || currentPoints.length === 0) return null;
    return (
      <SingleStrokeElement
        stroke={{
          id: 'live-preview',
          tool: activeDrawingTool,
          points: currentPoints,
          color: drawingColor,
          size: drawingSize,
          opacity: drawingOpacity,
        }}
      />
    );
  }, [activeDrawingTool, currentPoints, drawingColor, drawingSize, drawingOpacity]);

  // Selected stroke bounding box
  const selectedBounds = useMemo(() => {
    if (!selectedStrokeId || activeDrawingTool !== 'select') return null;
    const stroke = freehandStrokes[selectedStrokeId];
    if (!stroke) return null;
    return getStrokeBounds(stroke);
  }, [selectedStrokeId, activeDrawingTool, freehandStrokes]);

  return (
    <div
      className={`absolute inset-0 w-full h-full ${
        isDrawingActive 
          ? (activeDrawingTool === 'text' 
              ? 'cursor-text' 
              : activeDrawingTool === 'select' 
                ? (dragState ? 'cursor-grabbing' : 'cursor-default') 
                : activeDrawingTool === 'eraser'
                  ? 'cursor-pointer'
                  : 'cursor-crosshair') 
          : 'pointer-events-none'
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
        {/* Render all saved freehand strokes with memoized seed stability */}
        {Object.values(freehandStrokes).map((stroke) => (
          <SingleStrokeElement
            key={stroke.id}
            stroke={stroke}
            isEditing={activeTextEdit?.id === stroke.id}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (isDrawingActive && stroke.tool === 'text') {
                const pt = stroke.points[0];
                textOpenedAtRef.current = Date.now();
                setActiveTextEdit({
                  id: stroke.id,
                  x: pt.x,
                  y: pt.y,
                  text: stroke.text || '',
                });
              }
            }}
          />
        ))}

        {/* Render live active drawing preview */}
        {livePreview}

        {/* Excalidraw-like Selection Box */}
        {selectedBounds && (
          <g className="pointer-events-none">
            <rect
              x={selectedBounds.minX - 6}
              y={selectedBounds.minY - 6}
              width={selectedBounds.width + 12}
              height={selectedBounds.height + 12}
              fill="rgba(99, 102, 241, 0.06)"
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="4,4"
              rx={4}
            />
            {/* Corner Handles */}
            <circle cx={selectedBounds.minX - 6} cy={selectedBounds.minY - 6} r={4} fill="#ffffff" stroke="#6366f1" strokeWidth={1.5} />
            <circle cx={selectedBounds.maxX + 6} cy={selectedBounds.minY - 6} r={4} fill="#ffffff" stroke="#6366f1" strokeWidth={1.5} />
            <circle cx={selectedBounds.minX - 6} cy={selectedBounds.maxY + 6} r={4} fill="#ffffff" stroke="#6366f1" strokeWidth={1.5} />
            <circle cx={selectedBounds.maxX + 6} cy={selectedBounds.maxY + 6} r={4} fill="#ffffff" stroke="#6366f1" strokeWidth={1.5} />
          </g>
        )}
      </svg>

      {/* Direct In-Place Text Editor (Excalidraw-style) */}
      {activeTextEdit && (
        <div
          className="absolute pointer-events-auto z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1.5 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-indigo-500 rounded-xl shadow-2xl"
          style={{
            left: `${activeTextEdit.x * vpZoom + vpX}px`,
            top: `${activeTextEdit.y * vpZoom + vpY}px`,
            transformOrigin: '0 0',
            minWidth: '220px',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            autoFocus
            rows={2}
            value={activeTextEdit.text}
            onChange={(e) => {
              setActiveTextEdit({ ...activeTextEdit, text: e.target.value });
            }}
            onBlur={() => {
              // Only auto-commit on blur if not immediately after opening
              if (Date.now() - textOpenedAtRef.current > 350) {
                commitTextEdit();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                e.preventDefault();
                commitTextEdit();
              } else if (e.key === 'Escape') {
                setActiveTextEdit(null);
              }
            }}
            placeholder="Yazın..."
            className="w-full bg-transparent border-0 outline-none resize-none font-[family-name:var(--font-sketchy)] font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500"
            style={{
              color: drawingColor,
              fontFamily: 'Caveat, Kalam, var(--font-sketchy), cursive, sans-serif',
              fontSize: `${Math.max(18, drawingSize * 5.5)}px`,
              lineHeight: 1.25,
              letterSpacing: '0.02em',
            }}
          />
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400">
              <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">↵</kbd> Kaydet &nbsp;
              <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Esc</kbd> İptal
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTextEdit(null)}
                className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[11px]"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={commitTextEdit}
                className="px-2.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-colors text-[11px]"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

