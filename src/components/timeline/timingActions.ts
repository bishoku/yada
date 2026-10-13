import type { LogicalDiagram } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import type { TimingValues } from './timingModel';

/** UI edits are atomic undo transactions. Existing stored values are never normalized. */
export function commitStepTiming(id: string, timing: TimingValues, process?: { text: string; duration: number }, expectedDocument?: LogicalDiagram): boolean {
  const state = useAppStore.getState();
  if (expectedDocument && state.logicalData !== expectedDocument) return false;
  if (state.isReadOnly || state.isPlaying || !state.logicalData.sequences.some(step => step.id === id)) return false;
  if (![timing.duration, timing.delay, ...(process ? [process.duration] : [])].every(value => Number.isFinite(value) && value >= 0)) return false;
  const current = state.visualData.timelines[id];
  const timingChanged = timing.duration !== (current?.duration ?? 1000) || timing.delay !== (current?.delay ?? 0);
  const processChanged = process !== undefined && (process.text !== (current?.internalProcess?.text ?? '') || (!!process.text && process.duration !== (current?.internalProcess?.duration ?? 1000)));
  if (!timingChanged && !processChanged) return false;
  state.pushToHistory();
  if (timingChanged) state.updateSequenceTiming(id, timing.duration, timing.delay);
  if (processChanged) state.updateSequenceProcess(id, process!.text, process!.duration);
  return true;
}
