import { participantActivityKey, type ParticipantInterval } from '../sequencePlayback';
import { useSimulationSelector } from '../useSimulationSelector';
import React, { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';
import { NodeRegistry, getDefaultIcon } from '../../../registry/NodeRegistry';
import {
  HEADER_HEIGHT,
  MESSAGE_ROW_HEIGHT,
  PARTICIPANT_WIDTH,
  type SeqParticipantData,
} from '../useSequenceLayout';

// ── Theme mapping (matches BaseNode themeStyles) ──────────────────────────────
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

interface ThemeStyle {
  border: string;
  text: string;
  bg: string;
  activeBg: string;
  activeRing: string;
  activeBorder: string;
  activityFill: string;
  activityBorder: string;
  glowColor: string;
}

const colorClassToTheme: Record<string, ThemeStyle> = {
  'text-indigo-500': {
    border: 'border-indigo-500 dark:border-indigo-500/80',
    text: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500/5 dark:bg-indigo-500/10',
    activeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    activeRing: 'ring-4 ring-indigo-500/20',
    activeBorder: 'border-indigo-500',
    activityFill: 'rgba(99,102,241,0.12)',
    activityBorder: 'rgba(99,102,241,0.55)',
    glowColor: 'rgba(99,102,241,0.28)',
  },
  'text-emerald-500': {
    border: 'border-emerald-500 dark:border-emerald-500/80',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    activeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    activeRing: 'ring-4 ring-emerald-500/20',
    activeBorder: 'border-emerald-500',
    activityFill: 'rgba(16,185,129,0.12)',
    activityBorder: 'rgba(16,185,129,0.55)',
    glowColor: 'rgba(16,185,129,0.28)',
  },
  'text-amber-500': {
    border: 'border-amber-500 dark:border-amber-500/80',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/5 dark:bg-amber-500/10',
    activeBg: 'bg-amber-50 dark:bg-amber-950/40',
    activeRing: 'ring-4 ring-amber-500/20',
    activeBorder: 'border-amber-500',
    activityFill: 'rgba(245,158,11,0.12)',
    activityBorder: 'rgba(245,158,11,0.55)',
    glowColor: 'rgba(245,158,11,0.28)',
  },
  'text-rose-500': {
    border: 'border-rose-500 dark:border-rose-500/80',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/5 dark:bg-rose-500/10',
    activeBg: 'bg-rose-50 dark:bg-rose-950/40',
    activeRing: 'ring-4 ring-rose-500/20',
    activeBorder: 'border-rose-500',
    activityFill: 'rgba(244,63,94,0.12)',
    activityBorder: 'rgba(244,63,94,0.55)',
    glowColor: 'rgba(244,63,94,0.28)',
  },
  'text-rose-600': {
    border: 'border-rose-600 dark:border-rose-600/80',
    text: 'text-rose-700 dark:text-rose-500',
    bg: 'bg-rose-600/5 dark:bg-rose-600/10',
    activeBg: 'bg-rose-50 dark:bg-rose-950/40',
    activeRing: 'ring-4 ring-rose-600/20',
    activeBorder: 'border-rose-600',
    activityFill: 'rgba(225,29,72,0.12)',
    activityBorder: 'rgba(225,29,72,0.55)',
    glowColor: 'rgba(225,29,72,0.28)',
  },
  'text-cyan-500': {
    border: 'border-cyan-500 dark:border-cyan-500/80',
    text: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/5 dark:bg-cyan-500/10',
    activeBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    activeRing: 'ring-4 ring-cyan-500/20',
    activeBorder: 'border-cyan-500',
    activityFill: 'rgba(6,182,212,0.12)',
    activityBorder: 'rgba(6,182,212,0.55)',
    glowColor: 'rgba(6,182,212,0.28)',
  },
  'text-purple-500': {
    border: 'border-purple-500 dark:border-purple-500/80',
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/5 dark:bg-purple-500/10',
    activeBg: 'bg-purple-50 dark:bg-purple-950/40',
    activeRing: 'ring-4 ring-purple-500/20',
    activeBorder: 'border-purple-500',
    activityFill: 'rgba(168,85,247,0.12)',
    activityBorder: 'rgba(168,85,247,0.55)',
    glowColor: 'rgba(168,85,247,0.28)',
  },
};

const defaultTheme: ThemeStyle = {
  border: 'border-slate-300 dark:border-slate-600',
  text: 'text-slate-500 dark:text-slate-400',
  bg: 'bg-slate-50 dark:bg-slate-800/40',
  activeBg: 'bg-slate-100 dark:bg-slate-800/60',
  activeRing: 'ring-4 ring-slate-400/20',
  activeBorder: 'border-slate-400',
  activityFill: 'rgba(100,116,139,0.12)',
  activityBorder: 'rgba(100,116,139,0.4)',
  glowColor: 'rgba(100,116,139,0.25)',
};

// ── Activity tracking ─────────────────────────────────────────────────────────
// Returns the slot range that this participant should show an activity box for.
function useParticipantActivity(intervals: ParticipantInterval[]) {
  const key = useSimulationSelector(time => participantActivityKey(intervals, time));
  const [minSlot, maxSlot] = key ? key.split(':').map(Number) : [null, null];
  return { minSlot, maxSlot, isActive: minSlot !== null };
}

// ── Component ─────────────────────────────────────────────────────────────────
export const SeqParticipantNode = memo(function SeqParticipantNode({
  data,
}: NodeProps) {
  const { name, nodeType, lifelineHeight, messageSlots, activityIntervals } =
    data as unknown as SeqParticipantData;

  const { minSlot, maxSlot, isActive } = useParticipantActivity(activityIntervals);

  const themeName = useAppStore((s) => s.theme);
  const bgColor = useAppStore((s) => s.visualData.canvas.bgColor);
  const isBgDark = bgColor ? isColorDark(bgColor) : (themeName !== 'light');
  const defaultLifelineColor = isBgDark ? 'rgba(203, 213, 225, 0.8)' : 'rgba(71, 85, 105, 0.8)';

  // Registry definition
  const nodeDef    = NodeRegistry[nodeType];
  const colorClass = nodeDef?.colorClass ?? 'text-slate-500';
  const theme      = colorClassToTheme[colorClass] ?? defaultTheme;

  // Icon with theme color (matches BaseNode's getIcon)
  const icon = nodeDef
    ? React.cloneElement(nodeDef.icon as React.ReactElement, {
        className: `w-5 h-5 ${theme.text} transition-all duration-300`,
      } as React.HTMLAttributes<SVGElement>)
    : getDefaultIcon(theme.text);

  // ── Activity box (lifeline highlight) ────────────────────────────────────
  const ACTIVITY_BOX_WIDTH = 10;
  const activityBox = useMemo(() => {
    if (minSlot === null || maxSlot === null) return null;

    // topY = center of minSlot - half a row, bottomY = center of maxSlot + half a row
    const topY    = HEADER_HEIGHT + (minSlot + 0.25) * MESSAGE_ROW_HEIGHT;
    const bottomY = HEADER_HEIGHT + (maxSlot  + 0.75) * MESSAGE_ROW_HEIGHT;
    const height  = bottomY - topY;

    return (
      <div
        style={{
          position: 'absolute',
          left: `calc(50% - ${ACTIVITY_BOX_WIDTH / 2}px)`,
          top: topY,
          width: ACTIVITY_BOX_WIDTH,
          height,
          background: theme.activityFill,
          border: `1.5px solid ${theme.activityBorder}`,
          borderRadius: 4,
          zIndex: 4,
          boxShadow: `0 0 8px ${theme.glowColor}`,
          transition: 'top 0.15s ease, height 0.15s ease',
        }}
      />
    );
  }, [minSlot, maxSlot, theme]);

  // ── Handles — Only slots incident to this participant
  // Needed because forward edges use left=target/right=source,
  // while return edges use left=source/right=target.
  const handles = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (const i of messageSlots) {
      const yOffset = HEADER_HEIGHT + (i + 0.5) * MESSAGE_ROW_HEIGHT;
      const centerX = PARTICIPANT_WIDTH / 2;
      const sharedStyle: React.CSSProperties = {
        top: yOffset,
        left: centerX,
        transform: 'translate(-50%, -50%)',
        background: 'transparent',
        border: 'none',
        width: 2,
        height: 2,
        opacity: 0,
        pointerEvents: 'none',
      };
      result.push(
        <Handle key={`slot-${i}-left-src`}  type="source" position={Position.Top} id={`slot-${i}-left-src`}  style={sharedStyle} />,
        <Handle key={`slot-${i}-left-tgt`}  type="target" position={Position.Top} id={`slot-${i}-left-tgt`}  style={sharedStyle} />,
        <Handle key={`slot-${i}-right-src`} type="source" position={Position.Top} id={`slot-${i}-right-src`} style={sharedStyle} />,
        <Handle key={`slot-${i}-right-tgt`} type="target" position={Position.Top} id={`slot-${i}-right-tgt`} style={sharedStyle} />,
      );
    }
    return result;
  }, [messageSlots]);

  // ── Card classes (matches BaseNode card exactly) ──────────────────────────
  const cardClasses = [
    'flex flex-row items-center gap-3 px-4 py-3',
    'border-2 rounded-xl',
    'shadow-md dark:shadow-xl',
    'transition-all duration-200',
    'font-sans select-none cursor-default',
    'text-slate-800 dark:text-slate-100',
    isActive
      ? `${theme.activeBg} ${theme.activeBorder} scale-[1.02] ${theme.activeRing}`
      : `bg-white dark:bg-slate-900 ${theme.border}`,
  ].join(' ');

  const lifelineColor = isActive ? theme.activityBorder : defaultLifelineColor;

  return (
    <div
      style={{
        position: 'relative',
        width: PARTICIPANT_WIDTH,
        // Total height: header + lifeline + footer header
        height: HEADER_HEIGHT + lifelineHeight + HEADER_HEIGHT,
      }}
    >
      {/* ── Top header card ── */}
      <div
        className={cardClasses}
        style={{ width: PARTICIPANT_WIDTH, height: HEADER_HEIGHT, boxSizing: 'border-box' }}
      >
        <div
          className={`flex items-center justify-center shrink-0 p-1.5 rounded-lg border w-9 h-9 ${theme.bg} ${theme.border} transition-all duration-300`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xs truncate text-slate-800 dark:text-slate-200">{name}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            {nodeType}
          </div>
        </div>
      </div>

      {/* ── Dashed lifeline ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: HEADER_HEIGHT,
          width: 0,
          height: lifelineHeight,
          borderLeft: `2px dashed ${lifelineColor}`,
          transform: 'translateX(-1px)',
          zIndex: 1,
          transition: 'border-color 0.25s ease',
        }}
      />

      {/* ── Activity box overlay ── */}
      {activityBox}

      {/* ── Bottom footer card (UML convention) ── */}
      <div
        className={cardClasses}
        style={{
          position: 'absolute',
          top: HEADER_HEIGHT + lifelineHeight,
          left: 0,
          width: PARTICIPANT_WIDTH,
          height: HEADER_HEIGHT,
          boxSizing: 'border-box',
        }}
      >
        <div
          className={`flex items-center justify-center shrink-0 p-1.5 rounded-lg border w-9 h-9 ${theme.bg} ${theme.border} transition-all duration-300`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xs truncate text-slate-800 dark:text-slate-200">{name}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            {nodeType}
          </div>
        </div>
      </div>

      {/* ── Invisible handles ── */}
      {handles}
    </div>
  );
});
