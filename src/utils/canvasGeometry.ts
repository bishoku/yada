import type { LogicalDiagram, VisualDiagram } from '../types';
type Position = { x: number; y: number; width: number; height: number };
const revisions = new WeakMap<LogicalDiagram, WeakMap<VisualDiagram, ReturnType<typeof buildGeometry>>>();
function buildGeometry(logical: LogicalDiagram, visual: VisualDiagram) {
  const nodes = new Map(logical.nodes.map(node => [node.id, node]));
  const edges = new Map(logical.edges.map(edge => [edge.id, edge]));
  const sequences = new Map(logical.sequences.map(step => [step.id, step]));
  const positions = new Map<string, Position>();
  const visiting = new Set<string>();
  const minimumStep = new Map<string, number>();
  const stepsByEdge = new Map<string, typeof logical.sequences>();
  for (const step of logical.sequences) {
    minimumStep.set(step.edgeId, Math.min(minimumStep.get(step.edgeId) ?? Infinity, step.stepNumber));
    const steps = stepsByEdge.get(step.edgeId) ?? [];
    steps.push(step); stepsByEdge.set(step.edgeId, steps);
  }
  for (const steps of stepsByEdge.values()) steps.sort((a, b) => a.stepNumber - b.stepNumber);
  const groups = new Map<string, typeof logical.edges>();
  for (const edge of logical.edges) {
    const key = JSON.stringify([edge.sourceId, edge.targetId].sort());
    const group = groups.get(key) ?? [];
    group.push(edge); groups.set(key, group);
  }
  const offsets = new Map<string, number>();
  for (const group of groups.values()) {
    group.sort((a, b) => (minimumStep.get(a.id) ?? 999) - (minimumStep.get(b.id) ?? 999) || a.id.localeCompare(b.id));
    group.forEach((edge, index) => offsets.set(edge.id, (-(group.length - 1) * 15 + index * 30) * (edge.sourceId > edge.targetId ? -1 : 1)));
  }
  const absolutePosition = (id: string): Position => {
    const cached = positions.get(id);
    if (cached) return cached;
    const vis = visual.layoutNodes[id] ?? { x: 0, y: 0, width: 224, height: 52 };
    const local = { x: vis.x, y: vis.y, width: vis.width || 224, height: vis.height || 52 };
    // Deterministic fallback for malformed parent cycles, which previously overflowed recursion.
    if (visiting.has(id)) return local;
    visiting.add(id);
    const parent = nodes.get(id)?.parentId;
    const base = parent ? absolutePosition(parent) : { x: 0, y: 0 };
    const result = { ...local, x: local.x + base.x, y: local.y + base.y };
    visiting.delete(id); positions.set(id, result);
    return result;
  };
  return { nodes, edges, sequences, stepsByEdge, offsets, absolutePosition };
}
/** Derived-only weak caches follow the editor's immutable document revisions. */
export function getCanvasGeometry(logical: LogicalDiagram, visual: VisualDiagram) {
  let visuals = revisions.get(logical);
  if (!visuals) { visuals = new WeakMap(); revisions.set(logical, visuals); }
  let geometry = visuals.get(visual);
  if (!geometry) { geometry = buildGeometry(logical, visual); visuals.set(visual, geometry); }
  return geometry;
}
