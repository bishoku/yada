import React, { useState, useCallback, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { ShapeLayer } from '../../types';

/** Calculate regular polygon points */
function calcPolygonPoints(cx: number, cy: number, r: number, sides: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

/** Calculate star points with alternating outer/inner radius */
function calcStarPoints(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

interface StudioCanvasProps {
  width: number;
  height: number;
  layers: ShapeLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onSvgMouseDown: (e: React.MouseEvent, layerId: string) => void;
  onResizeMouseDown: (e: React.MouseEvent, layerId: string, handleType: 'tl' | 'tr' | 'bl' | 'br') => void;
}

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  width,
  height,
  layers,
  selectedLayerId,
  onSelectLayer,
  onSvgMouseDown,
  onResizeMouseDown,
}) => {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanningRef = useRef(false);
  const isSpaceHeldRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLElement>(null);

  // Sort layers by zIndex ascending for layout rendering
  const sortedLayersForDesign = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  // Track Space key for Figma-style pan
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        isSpaceHeldRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceHeldRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  // Ctrl+Scroll = zoom, plain Scroll = pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((z + delta) * 100) / 100)));
    } else {
      // Pan
      setPanX(px => px - e.deltaX);
      setPanY(py => py - e.deltaY);
    }
  }, []);

  // Space+drag or Middle mouse button pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const shouldPan = e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isSpaceHeldRef.current);
    if (shouldPan) {
      e.preventDefault();
      e.stopPropagation();
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isPanningRef.current) return;
        const dx = moveEvent.clientX - panStartRef.current.x;
        const dy = moveEvent.clientY - panStartRef.current.y;
        setPanX(panStartRef.current.panX + dx);
        setPanY(panStartRef.current.panY + dy);
      };

      const handleMouseUp = () => {
        isPanningRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return;
    }
  }, [panX, panY]);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <main 
      ref={containerRef}
      className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-8 relative"
      style={{ cursor: isSpaceHeldRef.current ? 'grab' : undefined }}
      onClick={() => { if (!isPanningRef.current) onSelectLayer(null); }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
      {/* Zoom Controls — bottom-right corner */}
      <div 
        className="absolute bottom-4 right-4 z-30 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg px-1.5 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        
        <button
          onClick={handleZoomReset}
          className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 min-w-[44px] text-center transition-colors cursor-pointer"
          title="Reset Zoom"
        >
          {zoomPercent}%
        </button>

        <button
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          onClick={handleZoomReset}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
          title="Fit to View"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Centered Canvas Border boundaries — with zoom/pan transform */}
      <div 
        className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 shadow-2xl relative select-none"
        style={{
          width,
          height,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanningRef.current ? 'none' : 'transform 0.1s ease-out',
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px), radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '10px 10px',
          backgroundPosition: '0 0, 5px 5px'
        }}
      >
        {/* SVG Render Container */}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          {/* Center guidelines */}
          <line x1={width/2} y1={0} x2={width/2} y2={height} stroke="#6366f1" strokeWidth={0.5} strokeDasharray="4,4" opacity={0.3} style={{pointerEvents:'none'}} />
          <line x1={0} y1={height/2} x2={width} y2={height/2} stroke="#6366f1" strokeWidth={0.5} strokeDasharray="4,4" opacity={0.3} style={{pointerEvents:'none'}} />

          {sortedLayersForDesign.map((layer) => {
            // Handle hidden layers
            if (layer.visible === false) return null;

            const { id, type, x, y, width: w, height: h, style, content } = layer;
            const isSelected = selectedLayerId === id;
            const opacity = style.opacity ?? 1;
            const isLocked = layer.locked === true;

            // Shared border styling inside design mode
            const strokeProps = isSelected 
              ? { stroke: '#6366f1', strokeWidth: Math.max(2, (style.strokeWidth ?? 0) + 1) } 
              : { stroke: style.stroke || 'none', strokeWidth: style.strokeWidth ?? 0 };

            const interactiveProps = {
              onMouseDown: (e: React.MouseEvent) => { if (!isLocked) onSvgMouseDown(e, id); },
              onClick: (e: React.MouseEvent) => e.stopPropagation(),
              style: { cursor: isLocked ? 'default' : 'move', pointerEvents: 'all' as const }
            };

            const renderShape = () => {
              switch (type) {
                case 'rectangle':
                  return (
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill={style.fill || 'transparent'}
                      {...strokeProps}
                      rx={style.rx ?? 0}
                      opacity={opacity}
                      {...interactiveProps}
                    />
                  );

                case 'circle':
                  return (
                    <ellipse
                      cx={x + w / 2}
                      cy={y + h / 2}
                      rx={w / 2}
                      ry={h / 2}
                      fill={style.fill || 'transparent'}
                      {...strokeProps}
                      opacity={opacity}
                      {...interactiveProps}
                    />
                  );

                case 'text': {
                  const textAlign = style.textAlign ?? 'center';
                  const textAnchor = textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'middle';
                  const textX = textAlign === 'left' ? x : textAlign === 'right' ? x + w : x + w / 2;
                  return (
                    <text
                      x={textX}
                      y={y + h / 2}
                      textAnchor={textAnchor}
                      dominantBaseline="central"
                      fill={style.fill || '#000000'}
                      {...strokeProps}
                      fontSize={style.fontSize ?? h * 0.7}
                      fontFamily={style.fontFamily || 'sans-serif'}
                      fontWeight={style.fontWeight || 'bold'}
                      {...((style.letterSpacing ?? 0) > 0 ? { letterSpacing: style.letterSpacing } : {})}
                      opacity={opacity}
                      className="select-none font-bold"
                      {...interactiveProps}
                    >
                      {content || ''}
                    </text>
                  );
                }

                case 'image':
                  return (
                    <g {...interactiveProps}>
                      {content ? (
                        <image
                          href={content}
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          preserveAspectRatio="none"
                          opacity={opacity}
                        />
                      ) : (
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="#f1f5f9"
                          stroke="#cbd5e1"
                          strokeWidth={2}
                          strokeDasharray="4,4"
                          opacity={opacity}
                        />
                      )}
                    </g>
                  );

                case 'triangle':
                  return (
                    <polygon
                      points={`${x + w / 2},${y} ${x},${y + h} ${x + w},${y + h}`}
                      fill={style.fill || 'transparent'}
                      {...strokeProps}
                      opacity={opacity}
                      {...interactiveProps}
                    />
                  );

                case 'star': {
                  const starCx = x + w / 2;
                  const starCy = y + h / 2;
                  const outerR = Math.min(w, h) / 2;
                  const starPoints = style.points ?? 5;
                  const innerR = outerR * (style.innerRadius ?? 0.4);
                  return (
                    <polygon
                      points={calcStarPoints(starCx, starCy, outerR, innerR, starPoints)}
                      fill={style.fill || 'transparent'}
                      {...strokeProps}
                      opacity={opacity}
                      {...interactiveProps}
                    />
                  );
                }

                case 'polygon': {
                  const polyCx = x + w / 2;
                  const polyCy = y + h / 2;
                  const polyR = Math.min(w, h) / 2;
                  const sides = style.sides ?? 6;
                  return (
                    <polygon
                      points={calcPolygonPoints(polyCx, polyCy, polyR, sides)}
                      fill={style.fill || 'transparent'}
                      {...strokeProps}
                      opacity={opacity}
                      {...interactiveProps}
                    />
                  );
                }

                case 'line':
                  return (
                    <line
                      x1={x}
                      y1={y + h / 2}
                      x2={x + w}
                      y2={y + h / 2}
                      stroke={style.stroke || '#000000'}
                      strokeWidth={style.strokeWidth ?? 2}
                      opacity={opacity}
                      {...interactiveProps}
                    />
                  );

                default:
                  return null;
              }
            };

            return (
              <g key={id} transform={`rotate(${style.rotation ?? 0} ${x + w / 2} ${y + h / 2})`}>
                {renderShape()}

                {/* Resize handle overlays */}
                {isSelected && (
                  <g>
                    {/* Outline box */}
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      strokeDasharray="3,3"
                      style={{ pointerEvents: 'none' }}
                    />
                    
                    {/* Handles (tl, tr, bl, br) */}
                    <circle
                      cx={x}
                      cy={y}
                      r={4.5}
                      fill="#ffffff"
                      stroke="#4f46e5"
                      strokeWidth={1.5}
                      style={{ cursor: 'nwse-resize', pointerEvents: 'all' }}
                      onMouseDown={(e) => onResizeMouseDown(e, id, 'tl')}
                    />
                    <circle
                      cx={x + w}
                      cy={y}
                      r={4.5}
                      fill="#ffffff"
                      stroke="#4f46e5"
                      strokeWidth={1.5}
                      style={{ cursor: 'nesw-resize', pointerEvents: 'all' }}
                      onMouseDown={(e) => onResizeMouseDown(e, id, 'tr')}
                    />
                    <circle
                      cx={x}
                      cy={y + h}
                      r={4.5}
                      fill="#ffffff"
                      stroke="#4f46e5"
                      strokeWidth={1.5}
                      style={{ cursor: 'nesw-resize', pointerEvents: 'all' }}
                      onMouseDown={(e) => onResizeMouseDown(e, id, 'bl')}
                    />
                    <circle
                      cx={x + w}
                      cy={y + h}
                      r={4.5}
                      fill="#ffffff"
                      stroke="#4f46e5"
                      strokeWidth={1.5}
                      style={{ cursor: 'nwse-resize', pointerEvents: 'all' }}
                      onMouseDown={(e) => onResizeMouseDown(e, id, 'br')}
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </main>
  );
};
