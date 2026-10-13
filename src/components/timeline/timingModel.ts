import type { SequenceStep } from '../../types';

export interface TimingValues { duration: number; delay: number }
export function parseTiming(duration: string, delay: string): TimingValues | null {
  if (!duration.trim() || !delay.trim()) return null;
  const values = { duration: Number(duration), delay: Number(delay) };
  return Object.values(values).every(value => Number.isFinite(value) && value >= 0) ? values : null;
}
export function timingFromDrag(initial: TimingValues, deltaPx: number, pxPerMs: number, resize: boolean): TimingValues {
  if (!Number.isFinite(pxPerMs) || pxPerMs <= 0) return initial;
  const delta = Math.round(deltaPx / pxPerMs / 50) * 50;
  if (delta === 0) return initial;
  return resize ? { duration: Math.max(100, initial.duration + delta), delay: initial.delay } : { duration: initial.duration, delay: Math.max(0, initial.delay + delta) };
}
export function timelineScale(width: number, maxTime: number, zoom = 1) {
  const pxPerMs = Math.max(0.0001, (width - 24) / Math.max(1, maxTime)) * Math.min(8, Math.max(1, zoom));
  return { pxPerMs, contentWidth: Math.max(width, maxTime * pxPerMs + 24) };
}
export function seekFromPosition(clientX: number, contentLeft: number, pxPerMs: number, maxTime: number) {
  return Math.min(maxTime, Math.max(0, (clientX - contentLeft) / pxPerMs));
}
export function stepNavigationTarget(sequences: SequenceStep[], schedules: Record<string, { start: number; end: number }>, selected: string | null, time: number, direction: -1 | 1) {
  const ordered = sequences.filter(step => schedules[step.id]).map((step, index) => ({ step, index })).sort((a, b) => schedules[a.step.id].start - schedules[b.step.id].start || a.index - b.index).map(item => item.step);
  const index = ordered.findIndex(step => step.id === selected);
  if (index >= 0) return ordered[index + direction];
  return direction === 1 ? ordered.find(step => schedules[step.id].start >= time) : [...ordered].reverse().find(step => schedules[step.id].start <= time);
}
