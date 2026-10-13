import type { SequenceStep, LogicalEdge } from '../../types';
import { computeSlots } from './sequenceLayoutUtils';
import { simulationClock } from '../../store/simulationClock';

export type Schedule = { start: number; end: number };
export interface ParticipantInterval extends Schedule {
  forwardSlot: number;
  returnSlot?: number;
}

/** Built once per sequence layout revision, never during an animation tick. */
export function buildSequencePlayback(
  sequences: SequenceStep[], edges: LogicalEdge[], schedules: Record<string, Schedule>,
) {
  const slots = computeSlots(sequences, schedules);
  const edgeById = new Map(edges.map(edge => [edge.id, edge]));
  const activityByParticipant = new Map<string, ParticipantInterval[]>();
  const slotsByParticipant = new Map<string, number[]>();
  for (const seq of sequences) {
    const edge = edgeById.get(seq.edgeId);
    const schedule = schedules[seq.id];
    const forwardSlot = slots.fwdSlotMap.get(seq.id);
    if (!edge || forwardSlot === undefined) continue;
    const returnSlot = slots.retSlotMap.get(seq.id);
    for (const id of new Set([edge.sourceId, edge.targetId])) {
      const participantSlots = slotsByParticipant.get(id) ?? [];
      participantSlots.push(forwardSlot);
      if (returnSlot !== undefined) participantSlots.push(returnSlot);
      slotsByParticipant.set(id, participantSlots);
      if (schedule) {
        const intervals = activityByParticipant.get(id) ?? [];
        intervals.push({ ...schedule, forwardSlot, returnSlot });
        activityByParticipant.set(id, intervals);
      }
    }
  }
  return { ...slots, activityByParticipant, slotsByParticipant };
}

/** Inclusive ends preserve the existing sequence activity display. */
export function participantActivityKey(intervals: ParticipantInterval[], time: number): string {
  let min: number | null = null;
  let max: number | null = null;
  for (const interval of intervals) {
    if (time < interval.start || time > interval.end) continue;
    min = min === null ? interval.forwardSlot : Math.min(min, interval.forwardSlot);
    max = Math.max(max ?? interval.forwardSlot, interval.forwardSlot, interval.returnSlot ?? interval.forwardSlot);
  }
  return min === null ? '' : `${min}:${max}`;
}

export type MessagePhase = 'idle' | 'forward' | 'waiting' | 'return';

/** Preserve legacy transit/phase semantics while changing only the clock source. */
export function messagePhase(time: number, schedule: Schedule | undefined, halfTransit: number, roundTrip: boolean): MessagePhase {
  if (!schedule || time < schedule.start || time > schedule.end) return 'idle';
  const elapsed = time - schedule.start;
  const total = schedule.end - schedule.start;
  if (total <= 0 || elapsed < halfTransit) return 'forward';
  if (roundTrip && elapsed >= total - halfTransit) return 'return';
  return 'waiting';
}

export function messageParticle(time: number, schedule: Schedule | undefined, halfTransit: number, isReturn: boolean) {
  if (!schedule || time < schedule.start || time > schedule.end) return null;
  const elapsed = time - schedule.start;
  if (isReturn) {
    const start = schedule.end - schedule.start - halfTransit;
    if (elapsed < start) return null;
    return halfTransit <= 0 ? 1 : Math.min((elapsed - start) / halfTransit, 1);
  }
  if (elapsed >= halfTransit) return null;
  return halfTransit <= 0 ? 1 : Math.min(elapsed / halfTransit, 1);
}

/** Immediate delivery handles mounting mid-playback; unsubscribe prevents stale writes. */
export function subscribeMessageParticle(
  schedule: Schedule | undefined, halfTransit: number, isReturn: boolean,
  update: (progress: number | null) => void,
) {
  let previous: number | null | undefined;
  return simulationClock.subscribe(time => {
    const progress = messageParticle(time, schedule, halfTransit, isReturn);
    if (progress === previous) return;
    previous = progress;
    update(progress);
  });
}
