import type { LogicalDiagram } from '../../../types';

type Schedule = { start: number; end: number };
/** Merge half-open section activity intervals once per document/schedule revision. */
export function buildSectionIntervals(sectionId: string, logical: LogicalDiagram, schedules: Record<string, Schedule>): Schedule[] {
  const children = new Map<string, string[]>();
  for (const node of logical.nodes) {
    if (!node.parentId) continue;
    const ids = children.get(node.parentId) ?? [];
    ids.push(node.id);
    children.set(node.parentId, ids);
  }
  const descendants = new Set<string>([sectionId]);
  const pending = [...(children.get(sectionId) ?? [])];
  while (pending.length) {
    const id = pending.pop()!;
    if (descendants.has(id)) continue; // Malformed legacy parent cycles must not hang playback.
    descendants.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  descendants.delete(sectionId);
  const edges = new Set(logical.edges.filter(edge => descendants.has(edge.sourceId) || descendants.has(edge.targetId)).map(edge => edge.id));
  const intervals = logical.sequences.flatMap(seq => {
    const schedule = schedules[seq.id];
    return edges.has(seq.edgeId) && schedule && schedule.start < schedule.end ? [{ ...schedule }] : [];
  }).sort((a, b) => a.start - b.start);
  const merged: Schedule[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
    else merged.push(interval);
  }
  return merged;
}

export function sectionActiveAt(intervals: Schedule[], time: number): boolean {
  let low = 0, high = intervals.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (intervals[middle].start <= time) low = middle + 1;
    else high = middle;
  }
  return low > 0 && time < intervals[low - 1].end;
}

const maximumEnds = new WeakMap<Record<string, Schedule>, number>();
/** All edge instances share this reduction instead of each scanning the schedule table. */
export function maximumTimelineEnd(schedules: Record<string, Schedule>): number {
  const cached = maximumEnds.get(schedules);
  if (cached !== undefined) return cached;
  let end = 0;
  for (const schedule of Object.values(schedules)) end = Math.max(end, schedule.end);
  maximumEnds.set(schedules, end);
  return end;
}
