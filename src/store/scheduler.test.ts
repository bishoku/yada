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
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: false, isRoundTrip: false, direction: 'forward' },
      { id: 'seq-2', stepNumber: 2, edgeId: 'edge-2', isAsync: false, isRoundTrip: false, direction: 'forward' },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { sequenceId: 'seq-1', duration: 1000, delay: 0 },
      'seq-2': { sequenceId: 'seq-2', duration: 1500, delay: 200 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', from: 'node-1', to: 'node-2', fromPort: 'right', toPort: 'left', isAsync: false },
      { id: 'edge-2', from: 'node-2', to: 'node-3', fromPort: 'right', toPort: 'left', isAsync: false },
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
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: false, isRoundTrip: false, direction: 'forward' },
      { id: 'seq-2', stepNumber: 1, edgeId: 'edge-2', isAsync: false, isRoundTrip: false, direction: 'forward' },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { sequenceId: 'seq-1', duration: 1000, delay: 100 },
      'seq-2': { sequenceId: 'seq-2', duration: 1200, delay: 300 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', from: 'node-1', to: 'node-2', fromPort: 'right', toPort: 'left', isAsync: false },
      { id: 'edge-2', from: 'node-1', to: 'node-3', fromPort: 'right', toPort: 'left', isAsync: false },
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
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: true, isRoundTrip: false, direction: 'forward' },
      { id: 'seq-2', stepNumber: 2, edgeId: 'edge-2', isAsync: false, isRoundTrip: false, direction: 'forward' },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-1': { sequenceId: 'seq-1', duration: 1000, delay: 0 },
      'seq-2': { sequenceId: 'seq-2', duration: 1000, delay: 0 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-1', from: 'node-1', to: 'node-2', fromPort: 'right', toPort: 'left', isAsync: true },
      { id: 'edge-2', from: 'node-2', to: 'node-3', fromPort: 'right', toPort: 'left', isAsync: false },
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
      { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: false, isRoundTrip: true, direction: 'forward' },
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
      { id: 'edge-1', from: 'node-1', to: 'node-2', fromPort: 'right', toPort: 'left', isAsync: false },
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

  it('should handle nested sections correctly', () => {
    const sequences: SequenceStep[] = [
      { id: 'seq-entry', stepNumber: 1, edgeId: 'edge-entry', isAsync: false, isRoundTrip: false, direction: 'forward' },
      { id: 'seq-internal', stepNumber: 2, edgeId: 'edge-internal', isAsync: false, isRoundTrip: false, direction: 'forward' },
    ];
    const timelines: Record<string, TimelineTiming> = {
      'seq-entry': { sequenceId: 'seq-entry', duration: 1000, delay: 0 },
      'seq-internal': { sequenceId: 'seq-internal', duration: 800, delay: 100 },
    };
    const edges: LogicalEdge[] = [
      { id: 'edge-entry', from: 'node-outside', to: 'section-container', fromPort: 'right', toPort: 'left', isAsync: false },
      { id: 'edge-internal', from: 'node-inside-1', to: 'node-inside-2', fromPort: 'right', toPort: 'left', isAsync: false },
    ];
    const nodes: LogicalNode[] = [
      { id: 'node-outside', type: 'server', name: 'Outside' },
      { id: 'section-container', type: 'section', name: 'Section' },
      { id: 'node-inside-1', type: 'server', name: 'Inside 1', parentId: 'section-container' },
      { id: 'node-inside-2', type: 'server', name: 'Inside 2', parentId: 'section-container' },
    ];

    const schedules = calculateSchedules(sequences, timelines, edges, nodes);

    // seq-entry: starts at 0, arrival at 1000. It targets the section container itself.
    // The subflow (seq-internal) starts after seq-entry's arrival (1000) + delay (100) = 1100.
    // seq-internal ends at 1100 + 800 = 1900.
    // The total end of the section entry step includes the subflow, so it ends at 1900.
    expect(schedules['seq-entry']).toEqual({ start: 0, end: 1900 });
    expect(schedules['seq-internal']).toEqual({ start: 1100, end: 1900 });
  });
});
