import React, { useRef, memo, useMemo } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  Position,
} from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { useEdgeAnimation } from './hooks';
import { AnimationParticle } from './ParticleSvg';
import { resolveParticleType } from '../../config/particles';
import { getThemeEdgeColors } from '../../utils/themeUtils';
import { EdgeArrowType, EdgeConnectionType, EdgeGlowIntensity, EdgeLineStyle } from '../../types';

interface ParallelBezierParams {
  sourceX: number;
  sourceY: number;
  sourcePosition: string;
  targetX: number;
  targetY: number;
  targetPosition: string;
  offset: number;
}

function getParallelBezierPath({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  offset,
}: ParallelBezierParams): [string, number, number] {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const nx = -dy / len;
  const ny = dx / len;

  let c1x = sourceX;
  let c1y = sourceY;
  let c2x = targetX;
  let c2y = targetY;

  const controlOffset = Math.max(30, len * 0.3);

  if (sourcePosition === 'left') c1x -= controlOffset;
  else if (sourcePosition === 'right') c1x += controlOffset;
  else if (sourcePosition === 'top') c1y -= controlOffset;
  else if (sourcePosition === 'bottom') c1y += controlOffset;

  if (targetPosition === 'left') c2x -= controlOffset;
  else if (targetPosition === 'right') c2x += controlOffset;
  else if (targetPosition === 'top') c2y -= controlOffset;
  else if (targetPosition === 'bottom') c2y += controlOffset;

  c1x += nx * offset;
  c1y += ny * offset;
  c2x += nx * offset;
  c2y += ny * offset;

  const path = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;

  const labelX = 0.125 * sourceX + 0.375 * c1x + 0.375 * c2x + 0.125 * targetX;
  const labelY = 0.125 * sourceY + 0.375 * c1y + 0.375 * c2y + 0.125 * targetY;

  return [path, labelX, labelY];
}

/**
 * Generates a prominent loop path for self-referencing edges (source === target).
 */
function getSelfLoopPath(
  sourceX: number,
  sourceY: number,
  sourcePosition: string,
  targetX: number,
  targetY: number,
  targetPosition: string,
  siblingIndex: number,
  _siblingCount: number,
): [string, number, number] {
  const baseRadius = 70;
  const siblingStep = 35;
  const radius = baseRadius + siblingIndex * siblingStep;

  const srcSide = sourcePosition as string;
  const tgtSide = targetPosition as string;

  if (srcSide === tgtSide) {
    const gap = 20;
    let sx = sourceX, sy = sourceY, tx = targetX, ty = targetY;
    let c1x: number, c1y: number, c2x: number, c2y: number;

    switch (srcSide) {
      case 'top':
        sx = sourceX - gap; sy = sourceY;
        tx = targetX + gap; ty = targetY;
        c1x = sx - radius * 0.5; c1y = sy - radius;
        c2x = tx + radius * 0.5; c2y = ty - radius;
        break;
      case 'bottom':
        sx = sourceX - gap; sy = sourceY;
        tx = targetX + gap; ty = targetY;
        c1x = sx - radius * 0.5; c1y = sy + radius;
        c2x = tx + radius * 0.5; c2y = ty + radius;
        break;
      case 'left':
        sx = sourceX; sy = sourceY - gap;
        tx = targetX; ty = targetY + gap;
        c1x = sx - radius; c1y = sy - radius * 0.5;
        c2x = tx - radius; c2y = ty + radius * 0.5;
        break;
      case 'right':
      default:
        sx = sourceX; sy = sourceY - gap;
        tx = targetX; ty = targetY + gap;
        c1x = sx + radius; c1y = sy - radius * 0.5;
        c2x = tx + radius; c2y = ty + radius * 0.5;
        break;
    }

    const path = `M ${sx},${sy} C ${c1x},${c1y} ${c2x},${c2y} ${tx},${ty}`;
    const labelX = 0.125 * sx + 0.375 * c1x + 0.375 * c2x + 0.125 * tx;
    const labelY = 0.125 * sy + 0.375 * c1y + 0.375 * c2y + 0.125 * ty;
    return [path, labelX, labelY];
  }

  let c1x = sourceX, c1y = sourceY;
  let c2x = targetX, c2y = targetY;

  switch (srcSide) {
    case 'top':    c1y -= radius; break;
    case 'bottom': c1y += radius; break;
    case 'left':   c1x -= radius; break;
    case 'right':  c1x += radius; break;
  }

  switch (tgtSide) {
    case 'top':    c2y -= radius; break;
    case 'bottom': c2y += radius; break;
    case 'left':   c2x -= radius; break;
    case 'right':  c2x += radius; break;
  }

  const path = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;
  const labelX = 0.125 * sourceX + 0.375 * c1x + 0.375 * c2x + 0.125 * targetX;
  const labelY = 0.125 * sourceY + 0.375 * c1y + 0.375 * c2y + 0.125 * targetY;
  return [path, labelX, labelY];
}

/** Helper to render SVG marker shapes */
function renderMarkerShape(type: EdgeArrowType, color: string, isStart = false) {
  if (type === 'none') return null;

  switch (type) {
    case 'triangle':
      return isStart
        ? <path d="M8,0 L8,6 L0,3 z" fill={color} />
        : <path d="M0,0 L0,6 L8,3 z" fill={color} />;
    case 'open':
      return isStart
        ? <path d="M8,0 L0,3 L8,6" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M0,0 L8,3 L0,6" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />;
    case 'diamond':
      return <path d="M0,3 L4,0 L8,3 L4,6 z" fill={color} stroke={color} strokeWidth="0.5" />;
    case 'circle':
      return <circle cx="4" cy="3" r="2.8" fill={color} stroke={color} strokeWidth="0.5" />;
    default:
      return null;
  }
}

/** Helper to map lineStyle to strokeDasharray */
function getDashArray(lineStyle?: EdgeLineStyle, isAsync?: boolean): string | undefined {
  if (lineStyle) {
    switch (lineStyle) {
      case 'solid': return undefined;
      case 'dashed': return '8,4';
      case 'dotted': return '3,4';
      case 'longDash': return '16,6';
      case 'dashDot': return '12,4,3,4';
    }
  }
  return isAsync ? '5,5' : undefined;
}

export const AnimatedEdge: React.FC<EdgeProps> = memo((props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  } = props;

  const logicalData = useAppStore((s) => s.logicalData);
  const layoutEdges = useAppStore((s) => s.visualData.layoutEdges);
  const le = logicalData.edges.find((e) => e.id === id);
  const ve = layoutEdges[id];
  const isReversed = le ? le.sourceId !== props.source : false;
  const isSelfLoop = le ? le.sourceId === le.targetId : false;

  const siblingEdges = useMemo(() => {
    if (!le) return [];
    const related = logicalData.edges.filter(
      (e) => (e.sourceId === le.sourceId && e.targetId === le.targetId) || (e.sourceId === le.targetId && e.targetId === le.sourceId)
    );
    return [...related].sort((a, b) => {
      const aSeqs = logicalData.sequences.filter(s => s.edgeId === a.id);
      const bSeqs = logicalData.sequences.filter(s => s.edgeId === b.id);
      const aMinStep = aSeqs.length > 0 ? Math.min(...aSeqs.map(s => s.stepNumber)) : 999;
      const bMinStep = bSeqs.length > 0 ? Math.min(...bSeqs.map(s => s.stepNumber)) : 999;
      if (aMinStep !== bMinStep) return aMinStep - bMinStep;
      return a.id.localeCompare(b.id);
    });
  }, [logicalData.edges, logicalData.sequences, le]);

  const siblingIndex = siblingEdges.findIndex((e) => e.id === id);
  const siblingCount = siblingEdges.length;

  let offset = 0;
  if (siblingCount > 1 && siblingIndex >= 0) {
    const step = 30;
    const start = -((siblingCount - 1) * step) / 2;
    offset = start + siblingIndex * step;
  }

  if (le && le.sourceId > le.targetId) {
    offset = -offset;
  }

  const connectionType: EdgeConnectionType = ve?.connectionType ?? 'bezier';
  const sx = isReversed ? targetX : sourceX;
  const sy = isReversed ? targetY : sourceY;
  const sPos = (isReversed ? targetPosition : sourcePosition) as Position;
  const tx = isReversed ? sourceX : targetX;
  const ty = isReversed ? sourceY : targetY;
  const tPos = (isReversed ? sourcePosition : targetPosition) as Position;

  // Compute path based on connectionType
  let [edgePath, defaultLabelX, defaultLabelY] = useMemo<[string, number, number]>(() => {
    if (isSelfLoop) {
      return getSelfLoopPath(
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        siblingIndex >= 0 ? siblingIndex : 0,
        siblingCount,
      );
    }

    if (offset !== 0 && connectionType === 'bezier') {
      return getParallelBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sPos,
        targetPosition: tPos,
        targetX: tx,
        targetY: ty,
        offset,
      });
    }

    switch (connectionType) {
      case 'smoothstep': {
        const [p, lx, ly] = getSmoothStepPath({
          sourceX: sx,
          sourceY: sy,
          sourcePosition: sPos,
          targetX: tx,
          targetY: ty,
          targetPosition: tPos,
          borderRadius: 12,
        });
        return [p, lx, ly];
      }
      case 'step': {
        const [p, lx, ly] = getSmoothStepPath({
          sourceX: sx,
          sourceY: sy,
          sourcePosition: sPos,
          targetX: tx,
          targetY: ty,
          targetPosition: tPos,
          borderRadius: 0,
        });
        return [p, lx, ly];
      }
      case 'straight': {
        const [p, lx, ly] = getStraightPath({
          sourceX: sx,
          sourceY: sy,
          targetX: tx,
          targetY: ty,
        });
        return [p, lx, ly];
      }
      case 'bezier':
      default: {
        const [p, lx, ly] = getBezierPath({
          sourceX: sx,
          sourceY: sy,
          sourcePosition: sPos,
          targetX: tx,
          targetY: ty,
          targetPosition: tPos,
        });
        return [p, lx, ly];
      }
    }
  }, [isSelfLoop, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, siblingIndex, siblingCount, offset, connectionType, sx, sy, sPos, tx, ty, tPos]);

  const pathRef = useRef<SVGPathElement>(null);

  // Custom hook for animation calculation
  const { particlePos, particlePositions, isAnimating, isSelected, isAsync, seqsForEdge, activeStepNumber } = useEdgeAnimation(id, pathRef);

  // Label positioning along path (default 50%)
  const labelPosPercent = ve?.labelPosition ?? 50;
  const labelPosRef = useRef<{ x: number; y: number } | null>(null);

  if (pathRef.current && labelPosPercent !== 50) {
    try {
      const totalLen = pathRef.current.getTotalLength();
      const pt = pathRef.current.getPointAtLength((labelPosPercent / 100) * totalLen);
      labelPosRef.current = { x: pt.x, y: pt.y };
    } catch {
      labelPosRef.current = null;
    }
  } else {
    labelPosRef.current = null;
  }

  const labelX = labelPosRef.current ? labelPosRef.current.x : defaultLabelX;
  const labelY = labelPosRef.current ? labelPosRef.current.y : defaultLabelY;

  // Build step labels string
  const stepNums = seqsForEdge
    .map((s) => s.stepNumber)
    .sort((a, b) => a - b)
    .filter((value, index, self) => self.indexOf(value) === index);
  const protocolText = le?.protocol ? `- [${le.protocol}]` : '';
  const stepLabel = stepNums.length > 0 ? `${stepNums.join(', ')}${protocolText}` : '';

  const appTheme = useAppStore((s) => s.theme);
  const themeColors = useMemo(() => getThemeEdgeColors(appTheme), [appTheme]);

  const hasCustomColor = !!(ve?.color);
  const customColor = ve?.color || themeColors.defaultColor;
  const activeColor = hasCustomColor ? ve!.color! : themeColors.activeColor;

  let isEdgeActive = false;
  if (isAnimating || isSelected) isEdgeActive = true;

  const strokeColor = isEdgeActive ? activeColor : customColor;
  const particleType = resolveParticleType(ve?.particleType);

  // Arrowheads
  const showArrowLegacy = ve?.showArrow ?? false;
  const arrowEndType: EdgeArrowType = ve?.arrowEnd ?? (showArrowLegacy ? 'triangle' : 'none');
  const arrowStartType: EdgeArrowType = ve?.arrowStart ?? 'none';

  const markerEndId = arrowEndType !== 'none' ? `arrow-end-${id}-${isEdgeActive ? 'active' : 'idle'}` : undefined;
  const markerStartId = arrowStartType !== 'none' ? `arrow-start-${id}-${isEdgeActive ? 'active' : 'idle'}` : undefined;

  // Stroke width
  const baseStrokeWidth = ve?.strokeWidth ?? 2;
  const currentStrokeWidth = isEdgeActive ? Math.max(4, baseStrokeWidth + 1.5) : baseStrokeWidth;

  // Dash pattern
  const strokeDasharray = getDashArray(ve?.lineStyle, isAsync);

  // Gradient
  const hasGradient = !!(ve?.gradientColor);
  const gradientId = hasGradient ? `grad-${id}-${isEdgeActive ? 'active' : 'idle'}` : undefined;
  const finalStroke = hasGradient ? `url(#${gradientId})` : strokeColor;

  // Glow intensity
  const glowIntensity: EdgeGlowIntensity = ve?.glowIntensity ?? (isEdgeActive ? 'subtle' : 'none');
  let filterStyle: string | undefined = undefined;

  switch (glowIntensity) {
    case 'subtle':
      filterStyle = `drop-shadow(0 0 4px ${strokeColor}aa)`;
      break;
    case 'strong':
      filterStyle = `drop-shadow(0 0 8px ${strokeColor}dd)`;
      break;
    case 'neon':
      filterStyle = `drop-shadow(0 0 3px ${strokeColor}) drop-shadow(0 0 10px ${strokeColor})`;
      break;
    case 'none':
    default:
      filterStyle = undefined;
      break;
  }

  return (
    <>
      {/* Dynamic defs for arrows & gradients */}
      <defs>
        {arrowEndType !== 'none' && (
          <marker
            id={markerEndId}
            markerWidth="10"
            markerHeight="10"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            {renderMarkerShape(arrowEndType, strokeColor, false)}
          </marker>
        )}
        {arrowStartType !== 'none' && (
          <marker
            id={markerStartId}
            markerWidth="10"
            markerHeight="10"
            refX="1"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            {renderMarkerShape(arrowStartType, strokeColor, true)}
          </marker>
        )}
        {hasGradient && (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} />
            <stop offset="100%" stopColor={ve!.gradientColor} />
          </linearGradient>
        )}
      </defs>

      {/* Invisible thicker path to make clicking the edge easier */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(16, currentStrokeWidth + 10)}
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer' }}
      />
      
      {/* Visible edge line */}
      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        strokeDasharray={strokeDasharray}
        markerStart={markerStartId ? `url(#${markerStartId})` : undefined}
        markerEnd={markerEndId ? `url(#${markerEndId})` : undefined}
        className="react-flow__edge-path transition-all duration-150"
        style={{
          stroke: finalStroke,
          strokeWidth: currentStrokeWidth,
          filter: filterStyle,
        }}
      />
      
      {/* Playback particles */}
      {particlePositions && particlePositions.length > 0
        ? particlePositions.map((pos, idx) => (
            <g
              key={`particle-${idx}`}
              transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.rotation})`}
              style={{ pointerEvents: 'none' }}
            >
              <AnimationParticle
                type={particleType}
                rotation={pos.rotation}
                stepNumber={activeStepNumber}
                color={strokeColor}
              />
            </g>
          ))
        : particlePos && (
            <g
              transform={`translate(${particlePos.x}, ${particlePos.y}) rotate(${particlePos.rotation})`}
              style={{ pointerEvents: 'none' }}
            >
              <AnimationParticle
                type={particleType}
                rotation={particlePos.rotation}
                stepNumber={activeStepNumber}
                color={strokeColor}
              />
            </g>
          )
      }

      {/* Dynamic Step Order Labels overlay */}
      {stepLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div 
              className={
                isEdgeActive
                  ? "px-2 py-0.5 rounded-full text-white text-[9px] font-extrabold shadow-md select-none transition-colors duration-150"
                  : "px-2 py-0.5 rounded-full bg-slate-900/90 dark:bg-white text-white dark:text-slate-950 text-[9px] font-extrabold shadow-md border border-slate-700/50 dark:border-slate-200 transition-colors select-none"
              }
              style={isEdgeActive ? { backgroundColor: activeColor, borderColor: activeColor } : undefined}
            >
              {stepLabel}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});


