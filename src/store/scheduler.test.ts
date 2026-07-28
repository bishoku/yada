import { describe, it, expect } from 'vitest';
import { calculateSchedules } from './scheduler';
import { SequenceStep, TimelineTiming, LogicalEdge, LogicalNode } from '../types';

describe('calculateSchedules', () => {
  it('should return empty schedule for empty sequences', () => {
    const schedules = calculateSchedules([], {}, [], []);
    expect(schedules).toEqual({});
  });

  it('should schedule basic sequential steps correctly', () => {
    const sequences: SequenceStep[] = [
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: false, isRoundTrip: false },
      { id: 'seq-2', stepNumber: 2, edgeId: 'edge-2', isAsync: false, isRoundTrip: false },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { sequenceId: 'seq-1', duration: 1000, delay: 0 },
      'seq-2': { sequenceId: 'seq-2', duration: 1500, delay: 200 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', isAsync: false },
      { id: 'edge-2', sourceId: 'node-2', targetId: 'node-3', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-1', type: 'server', name: 'N1' },
      { id: 'node-2', type: 'server', name: 'N2' },
      { id: 'node-3', type: 'server', name: 'N3' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // seq-1: start at 0 (no delay), ends at 0 + 1000 = 1000
    expect(schedules['seq-1']).toEqual({ start: 0, end: 1000 });
    // seq-2: starts after seq-1 ends (1000) + delay (200) = 1200, ends at 1200 + 1500 = 2700
    expect(schedules['seq-2']).toEqual({ start: 1200, end: 2700 });
  });

  it('should schedule parallel steps concurrently', () => {
    // Both sequences have stepNumber: 1
    const sequences: SequenceStep[] = [
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: false, isRoundTrip: false },
      { id: 'seq-2', stepNumber: 1, edgeId: 'edge-2', isAsync: false, isRoundTrip: false },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { sequenceId: 'seq-1', duration: 1000, delay: 100 },
      'seq-2': { sequenceId: 'seq-2', duration: 1200, delay: 300 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', isAsync: false },
      { id: 'edge-2', sourceId: 'node-1', targetId: 'node-3', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-1', type: 'server', name: 'N1' },
      { id: 'node-2', type: 'server', name: 'N2' },
      { id: 'node-3', type: 'server', name: 'N3' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // Both start from 0 because they are in the same stepNumber group
    expect(schedules['seq-1']).toEqual({ start: 100, end: 1100 });
    expect(schedules['seq-2']).toEqual({ start: 300, end: 1500 });
  });

  it('should schedule async steps and not block subsequent steps', () => {
    const sequences: SequenceStep[] = [
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: true, isRoundTrip: false },
      { id: 'seq-2', stepNumber: 2, edgeId: 'edge-2', isAsync: false, isRoundTrip: false },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { sequenceId: 'seq-1', duration: 1000, delay: 0 },
      'seq-2': { sequenceId: 'seq-2', duration: 1000, delay: 0 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', isAsync: true },
      { id: 'edge-2', sourceId: 'node-2', targetId: 'node-3', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-1', type: 'server', name: 'N1' },
      { id: 'node-2', type: 'server', name: 'N2' },
      { id: 'node-3', type: 'server', name: 'N3' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // seq-1 starts at 0, ends at 1000. It is async.
    expect(schedules['seq-1']).toEqual({ start: 0, end: 1000 });
    // seq-2 should start at 0 because the previous step (seq-1) is async and doesn't block
    expect(schedules['seq-2']).toEqual({ start: 0, end: 1000 });
  });

  it('should handle round-trip steps with internal process timing', () => {
    const sequences: SequenceStep[] = [
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: false, isRoundTrip: true },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { 
        sequenceId: 'seq-1', 
        duration: 1000, // transit time (500 forward, 500 return)
        delay: 0,
        internalProcess: { text: 'Saving to DB', duration: 800 }
      },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-1', type: 'server', name: 'N1' },
      { id: 'node-2', type: 'server', name: 'N2' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // start: 0
    // forward reach: 0 + 500 = 500
    // internal process: 500 + 800 = 1300
    // return transit: 1300 + 500 = 1800
    expect(schedules['seq-1']).toEqual({ start: 0, end: 1800 });
  });

  it('should treat edges targeting sections as normal edges (no subflow)', () => {
    // With the simplified scheduler, edges targeting a section node are
    // treated identically to any other edge — no subflow nesting occurs.
    const sequences: SequenceStep[] = [
      { id: 'seq-entry', stepNumber: 1, edgeId: 'edge-entry', isAsync: false, isRoundTrip: false },
      { id: 'seq-internal', stepNumber: 2, edgeId: 'edge-internal', isAsync: false, isRoundTrip: false },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-entry': { sequenceId: 'seq-entry', duration: 1000, delay: 0 },
      'seq-internal': { sequenceId: 'seq-internal', duration: 800, delay: 100 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-entry', sourceId: 'node-outside', targetId: 'section-container', isAsync: false },
      { id: 'edge-internal', sourceId: 'node-inside-1', targetId: 'node-inside-2', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-outside', type: 'server', name: 'Outside' },
      { id: 'section-container', type: 'section', name: 'Section' },
      { id: 'node-inside-1', type: 'server', name: 'Inside 1', parentId: 'section-container' },
      { id: 'node-inside-2', type: 'server', name: 'Inside 2', parentId: 'section-container' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // seq-entry is a normal edge: start=0, end=0+1000=1000
    expect(schedules['seq-entry']).toEqual({ start: 0, end: 1000 });
    // seq-internal is an independent root-level step (no longer nested as subflow).
    // It starts after globalFloor (1000) + delay (100) = 1100, ends at 1100+800=1900.
    expect(schedules['seq-internal']).toEqual({ start: 1100, end: 1900 });
  });

  it('independent parallel chains should not block each other across step groups', () => {
    // Source-chain dependency ensures that each step starts based on when
    // its source node was last targeted, not on a global barrier.
    const sequences: SequenceStep[] = [
      // Step 1 — parallel
      { id: 'seq-client-srv-a', stepNumber: 1, edgeId: 'edge-client-srv-a', isAsync: false, isRoundTrip: false },
      { id: 'seq-client-gw-b',  stepNumber: 1, edgeId: 'edge-client-gw-b',  isAsync: false, isRoundTrip: false },
      // Step 2 — independent chains
      { id: 'seq-gw-b-srv-c',   stepNumber: 2, edgeId: 'edge-gw-b-srv-c',   isAsync: false, isRoundTrip: false },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-client-srv-a': { sequenceId: 'seq-client-srv-a', duration: 2000, delay: 0 },
      'seq-client-gw-b':  { sequenceId: 'seq-client-gw-b',  duration: 1000, delay: 0 },
      'seq-gw-b-srv-c':   { sequenceId: 'seq-gw-b-srv-c',   duration: 1000, delay: 0 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-client-srv-a', sourceId: 'node-client', targetId: 'node-srv-a', isAsync: false },
      { id: 'edge-client-gw-b',  sourceId: 'node-client', targetId: 'node-gw-b',  isAsync: false },
      { id: 'edge-gw-b-srv-c',   sourceId: 'node-gw-b',  targetId: 'node-srv-c',  isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-client', type: 'client',  name: 'Client' },
      { id: 'node-srv-a',  type: 'server',  name: 'Server A' },
      { id: 'node-gw-b',   type: 'gateway', name: 'Gateway B' },
      { id: 'node-srv-c',  type: 'server',  name: 'Server C' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // Step 1 both start at t=0 (parallel)
    expect(schedules['seq-client-srv-a'].start).toBe(0);
    expect(schedules['seq-client-srv-a'].end).toBe(2000);
    expect(schedules['seq-client-gw-b'].start).toBe(0);
    expect(schedules['seq-client-gw-b'].end).toBe(1000);

    // seq-gw-b-srv-c sources from node-gw-b, which was targeted by seq-client-gw-b.
    // It starts as soon as seq-client-gw-b finishes (t=1000),
    // NOT at t=2000 (the global floor from the slow Server-A chain).
    expect(schedules['seq-gw-b-srv-c'].start).toBe(1000);
    expect(schedules['seq-gw-b-srv-c'].end).toBe(2000);
  });
});
