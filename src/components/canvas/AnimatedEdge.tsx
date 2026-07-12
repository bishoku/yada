import React, { useEffect, useRef, useState } from 'react';
import { getBezierPath, EdgeProps, EdgeLabelRenderer } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { calculateSchedules } from '../../store/scheduler';

export const AnimatedEdge: React.FC<EdgeProps> = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const { logicalData, visualData, currentTime, selectedSequenceId } = useAppStore();
  const pathRef = useRef<SVGPathElement>(null);
  const [particlePos, setParticlePos] = useState<{ x: number; y: number } | null>(null);

  // Find all sequences that map to this edge
  const seqsForEdge = logicalData.sequences.filter((s) => s.edgeId === id);
  const isSelected = seqsForEdge.some((s) => s.id === selectedSequenceId);

  // Compute isAsync (dashed stroke style)
  const isAsync = seqsForEdge.some((s) => s.isAsync);

  // Calculate schedules
  const schedules = calculateSchedules(logicalData.sequences, visualData.timelines);
  
  // Find if playhead is currently animating this edge
  let activeSeq = null;
  for (const seq of seqsForEdge) {
    const sched = schedules[seq.id];
    if (sched && currentTime >= sched.start && currentTime <= sched.end) {
      activeSeq = seq;
      break;
    }
  }
  const isAnimating = !!activeSeq;

  // Build step labels string, e.g. "S1, S2"
  const stepNums = seqsForEdge
    .map((s) => `S${s.stepNumber}`)
    .filter((value, index, self) => self.indexOf(value) === index);
  const stepLabel = stepNums.join(', ');

  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl || !isAnimating || !activeSeq) {
      setParticlePos(null);
      return;
    }

    try {
      const sched = schedules[activeSeq.id];
      if (!sched) {
        setParticlePos(null);
        return;
      }

      const duration = sched.end - sched.start;
      if (duration <= 0) {
        setParticlePos(null);
        return;
      }

      const elapsed = currentTime - sched.start;
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);
      
      const totalLength = pathEl.getTotalLength();
      if (totalLength > 0) {
        const point = pathEl.getPointAtLength(progress * totalLength);
        setParticlePos({ x: point.x, y: point.y });
      }
    } catch (err) {
      setParticlePos(null);
    }
  }, [currentTime, isAnimating, activeSeq, logicalData.sequences, visualData.timelines]);

  // Determine stroke color
  let strokeColor = '#94a3b8'; // Default slate-400
  if (isSelected) {
    strokeColor = '#6366f1'; // Selected indigo-500
  } else if (isAnimating) {
    strokeColor = '#10b981'; // Animating emerald-500
  }

  return (
    <>
      {/* Invisible thicker path to make clicking the edge easier */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={15}
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer' }}
      />
      
      {/* Visible edge line */}
      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected || isAnimating ? 3 : 2}
        strokeDasharray={isAsync ? '5,5' : undefined}
        markerEnd={markerEnd}
        className="react-flow__edge-path transition-all duration-150"
      />
      
      {/* Playback particle dot */}
      {particlePos && (
        <g>
          {/* Outer glow ring */}
          <circle
            cx={particlePos.x}
            cy={particlePos.y}
            r={10}
            fill="#10b981"
            style={{ opacity: 0.4 }}
          />
          {/* Inner solid particle */}
          <circle
            cx={particlePos.x}
            cy={particlePos.y}
            r={6}
            fill="#10b981"
          />
        </g>
      )}

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
            <div className="px-2 py-0.5 rounded-full bg-slate-900/90 dark:bg-white text-white dark:text-slate-950 text-[9px] font-extrabold shadow-md border border-slate-700/50 dark:border-slate-200 transition-colors select-none">
              {stepLabel}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
