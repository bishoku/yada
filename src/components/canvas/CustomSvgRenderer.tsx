import React from 'react';
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

interface CustomSvgRendererProps {
  layers: ShapeLayer[];
  width: number;
  height: number;
}

export const CustomSvgRenderer: React.FC<CustomSvgRendererProps> = ({
  layers,
  width,
  height,
}) => {
  // Sort layers by zIndex ascending to render bottom layers first
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {sortedLayers.map((layer) => {
        // Handle hidden layers
        if (layer.visible === false) return null;

        const { id, type, x, y, width: w, height: h, style, content } = layer;
        const opacity = style.opacity ?? 1;
        const strokeProps = {
          stroke: style.stroke || 'none',
          strokeWidth: style.strokeWidth ?? 0,
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
                  className="select-none"
                >
                  {content || ''}
                </text>
              );
            }

            case 'image':
              return (
                <image
                  href={content || ''}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  preserveAspectRatio="none"
                  opacity={opacity}
                />
              );

            case 'triangle':
              return (
                <polygon
                  points={`${x + w / 2},${y} ${x},${y + h} ${x + w},${y + h}`}
                  fill={style.fill || 'transparent'}
                  {...strokeProps}
                  opacity={opacity}
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
                />
              );

            default:
              return null;
          }
        };

        return (
          <g key={id} transform={`rotate(${style.rotation ?? 0} ${x + w / 2} ${y + h / 2})`}>
            {renderShape()}
          </g>
        );
      })}
    </svg>
  );
};
