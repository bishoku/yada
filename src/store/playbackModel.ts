import type { SequenceStep, TimelineTiming } from '../types';
type Schedules = Record<string, { start: number; end: number }>;
export function activeSequencesAt(schedules: Schedules, time: number): string[] {
  return Object.keys(schedules).filter(id => time >= schedules[id].start && time < schedules[id].end);
}
/** One-way internal processes extend playback beyond transport; round trips already include them. */
export function playbackEnd(sequences: SequenceStep[], timelines: Record<string, TimelineTiming>, schedules: Schedules): number {
  const steps = new Map(sequences.map(step => [step.id, step]));
  let end = 2000;
  for (const [id, schedule] of Object.entries(schedules)) {
    const extra = !steps.get(id)?.isRoundTrip ? timelines[id]?.internalProcess?.duration ?? 0 : 0;
    end = Math.max(end, schedule.end + extra);
  }
  return end;
}
