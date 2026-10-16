import type { LogicalDiagram, VisualDiagram } from '../types';

export type DocumentSnapshot = { logicalData: LogicalDiagram; visualData: VisualDiagram };
// Weak keys do not retain abandoned source documents. Fingerprints also detect
// in-place changes in externally supplied data; snapshots never alias inputs.
let copies = new WeakMap<object, { json: string; copy: unknown }>();
function copyJson<T>(value: T): T {
  if (value === undefined) return value;
  const json = JSON.stringify(value);
  if (value && typeof value === 'object') {
    const cached = copies.get(value);
    if (cached?.json === json) return cached.copy as T;
    const copy = JSON.parse(json) as T;
    copies.set(value, { json, copy });
    return copy;
  }
  return JSON.parse(json) as T;
}
function copyList<T>(values: T[]): T[] {
  const json = JSON.stringify(values);
  const cached = copies.get(values);
  if (cached?.json === json) return cached.copy as T[];
  const copy = values.map(copyJson);
  copies.set(values, { json, copy });
  return copy;
}
function copyRecords<T>(values: Record<string, T> | undefined): Record<string, T> | undefined {
  return values && Object.fromEntries(Object.entries(values).map(([id, value]) => [id, copyJson(value)]));
}
/** Defensive JSON snapshots share unchanged entities, not mutable source objects. */
export function snapshotDocument(logicalData: LogicalDiagram, visualData: VisualDiagram): DocumentSnapshot {
  const {nodes, edges, sequences, ...logicalExtras} = logicalData;
  const {canvas, layoutNodes, layoutEdges, timelines, annotations, freehandStrokes, ...visualExtras} = visualData;
  return {
    logicalData: { ...copyJson(logicalExtras), nodes: copyList(nodes), edges: copyList(edges), sequences: copyList(sequences) },
    visualData: {
      ...copyJson(visualExtras),
      canvas: copyJson(canvas),
      layoutNodes: copyRecords(layoutNodes)!,
      layoutEdges: copyRecords(layoutEdges)!,
      timelines: copyRecords(timelines)!,
      ...(annotations ? {annotations:copyRecords(annotations)} : {}),
      ...(freehandStrokes ? {freehandStrokes:copyRecords(freehandStrokes)} : {}),
    },
  };
}

export function resetHistorySnapshotCache() { copies = new WeakMap(); }
