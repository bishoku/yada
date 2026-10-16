import { describe, expect, it } from 'vitest';
import type { LogicalEdge, SequenceStep } from '../../../types';
import { getEdgeTopology } from './edgeTopology';

describe('shared parallel-edge topology', () => {
  it('matches legacy ordering for reverse edges, ties, self loops and unscheduled edges', () => {
    const edges: LogicalEdge[] = [
      { id:'late',isAsync:false, sourceId:'a', targetId:'b' }, { id:'early',isAsync:false, sourceId:'b', targetId:'a' },
      { id:'tie',isAsync:false, sourceId:'a', targetId:'b' }, { id:'empty',isAsync:false, sourceId:'a', targetId:'b' },
      { id:'loop',isAsync:false, sourceId:'a', targetId:'a' }, { id:'other',isAsync:false, sourceId:'x', targetId:'y' },
    ];
    const sequences: SequenceStep[] = [
      { id:'s1',isAsync:false,edgeId:'late',stepNumber:5 },{ id:'s2',isAsync:false,edgeId:'early',stepNumber:2 },
      { id:'s3',isAsync:false,edgeId:'tie',stepNumber:2 },{ id:'s4',isAsync:false,edgeId:'late',stepNumber:3 },
    ];
    const topology = getEdgeTopology(edges,sequences);
    for (const edge of edges) {
      const siblings = edges.filter(e => (e.sourceId === edge.sourceId && e.targetId === edge.targetId) || (e.sourceId === edge.targetId && e.targetId === edge.sourceId)).sort((a,b) => {
        const minimum = (id: string) => { const steps = sequences.filter(s => s.edgeId === id); return steps.length ? Math.min(...steps.map(s => s.stepNumber)) : 999; };
        return minimum(a.id)-minimum(b.id) || a.id.localeCompare(b.id);
      });
      expect(topology.siblingsByEdge.get(edge.id)).toEqual({ index:siblings.indexOf(edge),count:siblings.length });
      expect(topology.sequencesByEdge.get(edge.id) ?? []).toEqual(sequences.filter(s => s.edgeId === edge.id));
    }
    expect(edges.map(e => e.id)).toEqual(['late','early','tie','empty','loop','other']);
  });
  it('reuses a revision and invalidates either changed immutable array without retaining old documents', () => {
    const edges: LogicalEdge[] = [{id:'edge',isAsync:false,sourceId:'a',targetId:'b'}];
    const steps: SequenceStep[] = [{id:'s',isAsync:false,edgeId:'edge',stepNumber:1}];
    const first = getEdgeTopology(edges,steps);
    expect(getEdgeTopology(edges,steps)).toBe(first);
    expect(getEdgeTopology([...edges],steps)).not.toBe(first);
    const changed = getEdgeTopology(edges,[...steps,{id:'s2',isAsync:false,edgeId:'edge',stepNumber:2}]);
    expect(changed).not.toBe(first);
    expect(changed.sequencesByEdge.get('edge')).toHaveLength(2);
    expect(first.sequencesByEdge.get('edge')).toHaveLength(1);
  });
  it('does not collide for IDs containing separators', () => {
    const edges = [{id:'one',isAsync:false,sourceId:'a,b',targetId:'c'}, {id:'two',isAsync:false,sourceId:'a',targetId:'b,c'}];
    expect(getEdgeTopology(edges,[]).siblingsByEdge.get('one')?.count).toBe(1);
  });
});
