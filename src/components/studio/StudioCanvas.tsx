import React from 'react';
import { ShapeLayer } from '../../types';

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
  // Sort layers by zIndex ascending for layout rendering
  const sortedLayersForDesign = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <main 
      className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-8 relative"
      onClick={() => onSelectLayer(null)}
    >
      {/* Centered Canvas Border boundaries */}
      <div 
        className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 shadow-2xl relative select-none"
        style={{
          width,
          height,
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
          {sortedLayersForDesign.map((layer) => {
            const { id, type, x, y, width: w, height: h, style, content } = layer;
            const isSelected = selectedLayerId === id;
            const opacity = style.opacity ?? 1;

            // Shared border styling inside design mode
            const strokeProps = isSelected 
              ? { stroke: '#6366f1', strokeWidth: Math.max(2, (style.strokeWidth ?? 0) + 1) } 
              : { stroke: style.stroke || 'none', strokeWidth: style.strokeWidth ?? 0 };

            const interactiveProps = {
              onMouseDown: (e: React.MouseEvent) => onSvgMouseDown(e, id),
              onClick: (e: React.MouseEvent) => e.stopPropagation(),
              style: { cursor: 'move', pointerEvents: 'all' as const }
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

                case 'text':
                  return (
                    <text
                      x={x + w / 2}
                      y={y + h / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={style.fill || '#000000'}
                      {...strokeProps}
                      fontSize={h * 0.7}
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      opacity={opacity}
                      className="select-none font-bold"
                      {...interactiveProps}
                    >
                      {content || ''}
                    </text>
                  );

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
