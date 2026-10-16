import type { LogicalEdge, SequenceStep } from '../../../types';

// Shared across every mounted edge. Immutable document arrays make weak keys safe;
// old revisions can be collected along with undo history.
export interface EdgeTopology {
  edgesById: Map<string, LogicalEdge>;
  sequencesByEdge: Map<string, SequenceStep[]>;
  siblingsByEdge: Map<string, { index: number; count: number }>;
}
const cache = new WeakMap<LogicalEdge[], WeakMap<SequenceStep[], EdgeTopology>>();
export function getEdgeTopology(edges: LogicalEdge[], sequences: SequenceStep[]): EdgeTopology {
  let versions = cache.get(edges);
  if (!versions) { versions = new WeakMap(); cache.set(edges, versions); }
  const cached = versions.get(sequences);
  if (cached) return cached;
  const edgesById = new Map(edges.map(edge => [edge.id, edge]));
  const sequencesByEdge = new Map<string, SequenceStep[]>();
  const minimumStep = new Map<string, number>();
  for (const step of sequences) {
    const group = sequencesByEdge.get(step.edgeId) ?? [];
    group.push(step);
    sequencesByEdge.set(step.edgeId, group);
    minimumStep.set(step.edgeId, Math.min(minimumStep.get(step.edgeId) ?? Infinity, step.stepNumber));
  }
  const pairs = new Map<string, LogicalEdge[]>();
  for (const edge of edges) {
    // JSON encoding avoids collisions in IDs containing separators.
    const key = JSON.stringify([edge.sourceId, edge.targetId].sort());
    const group = pairs.get(key) ?? [];
    group.push(edge); pairs.set(key, group);
  }
  const siblingsByEdge = new Map<string, { index: number; count: number }>();
  for (const group of pairs.values()) {
    group.sort((a,b) => (minimumStep.get(a.id) ?? 999) - (minimumStep.get(b.id) ?? 999) || a.id.localeCompare(b.id));
    group.forEach((edge,index) => siblingsByEdge.set(edge.id, { index, count: group.length }));
  }
  const result = { edgesById, sequencesByEdge, siblingsByEdge };
  versions.set(sequences, result);
  return result;
}
export const EMPTY_EDGE_SEQUENCES: SequenceStep[] = [];
