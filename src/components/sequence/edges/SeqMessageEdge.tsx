import { memo, useRef, useEffect } from 'react';
import { type EdgeProps, EdgeLabelRenderer } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';
import type { SeqMessageData } from '../useSequenceLayout';

// ── Inject animation keyframes once ──────────────────────────────────────────
let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected || typeof document === 'undefined') return;
  _stylesInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    @keyframes seq-dot-pulse {
      0%, 100% { opacity: 0.9; }
      50%       { opacity: 1;   }
    }
    .seq-dot { animation: seq-dot-pulse 0.6s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
}

function isColorDark(color: string): boolean {
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  } else if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return true;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const SeqMessageEdge = memo(function SeqMessageEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  data,
}: EdgeProps) {
  ensureStyles();

  const themeName    = useAppStore((s) => s.theme);
  const bgColor      = useAppStore((s) => s.visualData.canvas.bgColor);
  const isDark       = bgColor ? isColorDark(bgColor) : themeName !== 'light';
  const schedules    = useAppStore((s) => s.schedules);
  const timelines    = useAppStore((s) => s.visualData.timelines);

  const msgData = data as unknown as SeqMessageData;
  if (!msgData) return null;

  const { stepNumber, protocol, isAsync, isReturn, isRoundTrip, seqId, description } = msgData;

  // ── Schedule ──────────────────────────────────────────────────────────────
  const schedule = schedules[seqId];
  const timing   = timelines[seqId];
  // halfTransit = duration / 2  ← exact same formula as scheduler.ts line 140
  // This is the time the forward AND return transit each take.
  const halfTransit = timing ? timing.duration / 2 : 400;

  // ── Phase for forward edge: forward-travel vs waiting vs return-travel ─────
  // Derived selector: component only re-renders when phase changes, NOT every frame!
  const phase = useAppStore((state): 'idle' | 'forward' | 'waiting' | 'return' => {
    const t = state.currentTime;
    if (!schedule || t < schedule.start || t > schedule.end) return 'idle';
    
    const elapsed = t - schedule.start;
    const total   = schedule.end - schedule.start;
    
    if (total <= 0) return 'forward';
    if (elapsed < halfTransit) return 'forward';
    if (!isRoundTrip) return 'waiting';
    
    const returnPhaseStart = total - halfTransit;
    if (elapsed >= returnPhaseStart) return 'return';
    return 'waiting';
  });

  const isActive = phase !== 'idle';
  const showDot = isActive && (
    isReturn ? phase === 'return' : phase === 'forward'
  );

  // ── Animated dot progress via DOM Ref (Bypasses React Render) ────────────
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!schedule) return;
    
    return useAppStore.subscribe((state) => {
      if (!dotRef.current) return;
      const t = state.currentTime;
      if (t < schedule.start || t > schedule.end) {
        dotRef.current.style.display = 'none';
        return;
      }

      const elapsed = t - schedule.start;
      const total = schedule.end - schedule.start;
      let dotProgress = 0;
      let shouldShow = false;

      if (isReturn) {
        const returnPhaseStart = total - halfTransit;
        if (elapsed >= returnPhaseStart) {
          dotProgress = halfTransit <= 0 ? 1 : Math.min((elapsed - returnPhaseStart) / halfTransit, 1);
          shouldShow = true;
        }
      } else {
        if (elapsed < halfTransit) {
          dotProgress = halfTransit <= 0 ? 1 : Math.min(elapsed / halfTransit, 1);
          shouldShow = true;
        }
      }

      if (shouldShow) {
        dotRef.current.style.display = 'block';
        const cx = sourceX + (targetX - sourceX) * dotProgress;
        dotRef.current.setAttribute('cx', cx.toString());
      } else {
        dotRef.current.style.display = 'none';
      }
    });
  }, [schedule, halfTransit, isReturn, sourceX, targetX]);

  // ── Colors ────────────────────────────────────────────────────────────────
  const syncColor        = isDark ? 'rgba(156, 163, 175, 0.85)' : 'rgba(71, 85, 105, 0.8)';
  const syncActiveColor  = isDark ? 'rgba(129, 140, 248, 1)'    : 'rgba(79, 70, 229, 1)';
  const asyncColor       = isDark ? 'rgba(52, 211, 153, 0.85)'  : 'rgba(5, 150, 105, 0.75)';
  const asyncActiveColor = isDark ? 'rgba(52, 211, 153, 1)'     : 'rgba(5, 150, 105, 1)';
  const returnColor      = isDark ? 'rgba(156, 163, 175, 0.6)'  : 'rgba(100, 116, 139, 0.5)';
  const returnActiveColor= isDark ? 'rgba(165, 180, 252, 1)'    : 'rgba(79, 70, 229, 0.9)';

  // Arrow stroke is ALWAYS visible (no fade/disappear)
  const strokeColor = isReturn
    ? (phase === 'return' ? returnActiveColor : returnColor)
    : isActive
      ? (isAsync ? asyncActiveColor : syncActiveColor)
      : (isAsync ? asyncColor       : syncColor);

  const strokeWidth = (isActive && (isReturn ? phase === 'return' : true)) ? 2.5 : 1.5;
  const dotColor    = isReturn ? returnActiveColor : (isAsync ? asyncActiveColor : syncActiveColor);

  // ── Geometry ──────────────────────────────────────────────────────────────
  const y = sourceY;  // both handles are on the same row slot Y
  const totalLen = Math.abs(targetX - sourceX);

  // Arrow path (always straight horizontal)
  const pathD = `M ${sourceX} ${y} L ${targetX} ${y}`;

  // ── Marker IDs (unique per edge to prevent bleed) ─────────────────────────
  const markerId = `arrow-${id}-${isDark ? 'd' : 'l'}`;

  // ── Glow filter for active dot ────────────────────────────────────────────
  const glowId = `dot-glow-${id}`;

  // ── Labels ────────────────────────────────────────────────────────────────
  const labelX = (sourceX + targetX) / 2;
  const labelY = y - 6;
  const label  = protocol ? `${stepNumber} [${protocol}]` : `${stepNumber}`;

  // Only show label on the forward edge (not the return)
  const showLabel = !isReturn;

  return (
    <>
      <defs>
        {/* Arrowhead marker */}
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="9"
          markerHeight="9"
          orient="auto-start-reverse"
        >
          {(isAsync && !isReturn) ? (
            /* Open chevron for async forward */
            <path
              d="M 0 1 L 10 6 L 0 11"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          ) : isReturn ? (
            /* Open chevron for return */
            <path
              d="M 0 1 L 10 6 L 0 11"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          ) : (
            /* Filled triangle for sync forward */
            <path d="M 0 0 L 12 6 L 0 12 Z" fill={strokeColor} />
          )}
        </marker>

        {/* Glow filter for dot only */}
        {showDot && (
          <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* ── Arrow path — ALWAYS rendered, never hidden ── */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isReturn ? '6 3' : isAsync ? '8 4' : 'none'}
        markerEnd={`url(#${markerId})`}
        style={{ transition: 'stroke 0.25s ease, stroke-width 0.25s ease' }}
      />

      {/* ── Animated particle dot (rendered ON TOP of path, never replacing it) ── */}
      {showDot && totalLen > 0 && (
        <circle
          ref={dotRef}
          className="seq-dot"
          cy={y}
          r={5}
          fill={dotColor}
          filter={`url(#${glowId})`}
          style={{ zIndex: 10, willChange: 'cx' }}
        />
      )}

      {/* ── Label (forward edges only) ── */}
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {/* Step + protocol pill */}
            <div
              style={{
                padding: '2px 8px',
                borderRadius: 5,
                background: isActive
                  ? isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)'
                  : isDark ? 'rgba(30,41,59,0.75)'   : 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${
                  isActive
                    ? isDark ? 'rgba(129,140,248,0.35)' : 'rgba(99,102,241,0.25)'
                    : isDark ? 'rgba(148,163,184,0.14)' : 'rgba(203,213,225,0.4)'
                }`,
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                color: isActive
                  ? isDark ? 'rgba(165,180,252,0.95)' : 'rgba(79,70,229,0.9)'
                  : isDark ? 'rgba(148,163,184,0.85)' : 'rgba(71,85,105,0.85)',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
                transition: 'background 0.25s ease, color 0.25s ease',
                boxShadow: isActive
                  ? isDark ? '0 2px 8px rgba(99,102,241,0.18)' : '0 2px 8px rgba(99,102,241,0.1)'
                  : 'none',
              }}
            >
              {label}
            </div>

            {/* Description */}
            {description && (
              <div
                style={{
                  fontSize: 10,
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  color: isDark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.5)',
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
              >
                {description}
              </div>
            )}

            {/* Phase label when active round-trip */}
            {isActive && isRoundTrip && (
              <div
                style={{
                  fontSize: 9,
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: phase === 'waiting'
                    ? isDark ? 'rgba(52,211,153,0.75)' : 'rgba(16,185,129,0.65)'
                    : isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.4)',
                }}
              >
                {phase === 'waiting' ? '⟳ processing' : '↩ round-trip'}
              </div>
            )}

            {/* Async badge */}
            {isAsync && (
              <div
                style={{
                  fontSize: 9,
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  fontWeight: 600,
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: isDark ? 'rgba(52,211,153,0.1)'  : 'rgba(16,185,129,0.06)',
                  color:      isDark ? 'rgba(52,211,153,0.75)' : 'rgba(16,185,129,0.65)',
                  border: `1px solid ${isDark ? 'rgba(52,211,153,0.18)' : 'rgba(16,185,129,0.14)'}`,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                async
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
