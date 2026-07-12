import React from 'react';
import { ShapeLayer } from '../../types';

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
        const { id, type, x, y, width: w, height: h, style, content } = layer;
        const opacity = style.opacity ?? 1;

        switch (type) {
          case 'rectangle':
            return (
              <rect
                key={id}
                x={x}
                y={y}
                width={w}
                height={h}
                fill={style.fill || 'transparent'}
                stroke={style.stroke || 'none'}
                strokeWidth={style.strokeWidth ?? 0}
                rx={style.rx ?? 0}
                opacity={opacity}
              />
            );

          case 'circle':
            return (
              <ellipse
                key={id}
                cx={x + w / 2}
                cy={y + h / 2}
                rx={w / 2}
                ry={h / 2}
                fill={style.fill || 'transparent'}
                stroke={style.stroke || 'none'}
                strokeWidth={style.strokeWidth ?? 0}
                opacity={opacity}
              />
            );

          case 'text':
            return (
              <text
                key={id}
                x={x + w / 2}
                y={y + h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={style.fill || '#000000'}
                stroke={style.stroke || 'none'}
                strokeWidth={style.strokeWidth ?? 0}
                fontSize={h * 0.7}
                fontFamily="sans-serif"
                fontWeight="bold"
                opacity={opacity}
                className="select-none"
              >
                {content || ''}
              </text>
            );

          case 'image':
            return (
              <image
                key={id}
                href={content || ''}
                x={x}
                y={y}
                width={w}
                height={h}
                preserveAspectRatio="none"
                opacity={opacity}
              />
            );

          default:
            return null;
        }
      })}
    </svg>
  );
};
