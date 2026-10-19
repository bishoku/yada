import type { LogicalDiagram } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { commitStepTiming } from './timingActions';
import type { TimingValues } from './timingModel';

export type TimingField = keyof TimingValues;
export function timingValue(id: string, field: TimingField) {
  return useAppStore.getState().visualData.timelines[id]?.[field] ?? (field === 'duration' ? 1000 : 0);
}

/** An individual field never overwrites a concurrent change to the other field. */
export function commitInlineTiming(id: string, field: TimingField, draft: string, document: LogicalDiagram, original: number) {
  const state = useAppStore.getState();
  if (state.isPlaying || state.isReadOnly) return 'blocked';
  if (state.logicalData !== document || timingValue(id, field) !== original || !state.logicalData.sequences.some(step => step.id === id)) return 'stale';
  const text = draft.trim();
  const value = Number(text.replace(',', '.'));
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(value) || value < 0) return 'invalid';
  if (value === original) return 'unchanged';
  const timing = { duration: timingValue(id, 'duration'), delay: timingValue(id, 'delay'), [field]: value };
  return commitStepTiming(id, timing, undefined, document) ? 'saved' : 'blocked';
}
