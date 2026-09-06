import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';

describe('Edge Section Validation & Reconnection Safeguards', () => {
  beforeEach(() => {
    useAppStore.setState({
      pastStates: [],
      futureStates: [],
      layoutVersion: 0,
      logicalData: {
        schemaVersion: 2,
        nodes: [
          { id: 'node-1', type: 'service', name: 'Service A' },
          { id: 'node-2', type: 'service', name: 'Service B' },
          { id: 'node-3', type: 'service', name: 'Service C' },
          { id: 'sec-1', type: 'section', name: 'Section 1' },
          { id: 'sec-2', type: 'section', name: 'Section 2' },
          { id: 'note-1', type: 'sticky_note', name: 'Note' },
        ],
        edges: [
          { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', isAsync: false },
          { id: 'edge-2', sourceId: 'node-1', targetId: 'node-3', isAsync: false },
        ],
        sequences: [
          { id: 'seq-1', edgeId: 'edge-1', stepNumber: 1, isAsync: false },
          { id: 'seq-2', edgeId: 'edge-2', stepNumber: 2, isAsync: false },
        ],
      },
      visualData: {
        canvas: { zoom: 1, pan: { x: 0, y: 0 } },
        layoutNodes: {
          'node-1': { id: 'node-1', x: 50, y: 100, width: 200, height: 50 },
          'node-2': { id: 'node-2', x: 300, y: 100, width: 200, height: 50 },
          'node-3': { id: 'node-3', x: 300, y: 250, width: 200, height: 50 },
          'sec-1': { id: 'sec-1', x: 0, y: 0, width: 500, height: 400 },
          'sec-2': { id: 'sec-2', x: 600, y: 0, width: 500, height: 400 },
        },
        layoutEdges: {
          'edge-1': { id: 'edge-1', sourceHandle: 'right:50', targetHandle: 'left:50' },
          'edge-2': { id: 'edge-2', sourceHandle: 'right:50', targetHandle: 'left:50' },
        },
        timelines: {},
      },
    });
  });

  it('rejects reconnecting an edge to a section', () => {
    const { reconnectEdge } = useAppStore.getState();

    // Attempt to reconnect edge-1 target from node-2 to sec-1
    reconnectEdge('edge-1', 'node-1', 'sec-1', 'right:50', 'left:50');

    const state = useAppStore.getState();
    const edge = state.logicalData.edges.find((e) => e.id === 'edge-1');
    // Target should remain node-2, not sec-1
    expect(edge?.targetId).toBe('node-2');
  });

  it('rejects reconnecting an edge from a section', () => {
    const { reconnectEdge } = useAppStore.getState();

    // Attempt to reconnect edge-1 source from node-1 to sec-2
    reconnectEdge('edge-1', 'sec-2', 'node-2', 'right:50', 'left:50');

    const state = useAppStore.getState();
    const edge = state.logicalData.edges.find((e) => e.id === 'edge-1');
    // Source should remain node-1, not sec-2
    expect(edge?.sourceId).toBe('node-1');
  });

  it('rejects reconnecting an edge to a sticky note', () => {
    const { reconnectEdge } = useAppStore.getState();

    // Attempt to reconnect edge-1 target to note-1
    reconnectEdge('edge-1', 'node-1', 'note-1', 'right:50', 'left:50');

    const state = useAppStore.getState();
    const edge = state.logicalData.edges.find((e) => e.id === 'edge-1');
    expect(edge?.targetId).toBe('node-2');
  });

  it('successfully reconnects an edge between valid component nodes', () => {
    const { reconnectEdge } = useAppStore.getState();

    // Reconnect edge-1 target from node-2 to node-3
    reconnectEdge('edge-1', 'node-1', 'node-3', 'right:50', 'top:50');

    const state = useAppStore.getState();
    const edge = state.logicalData.edges.find((e) => e.id === 'edge-1');
    expect(edge?.targetId).toBe('node-3');

    const layoutEdge = state.visualData.layoutEdges['edge-1'];
    expect(layoutEdge?.targetHandle).toBe('top:50');
  });

  it('allows multiple edges to share the same connector handle', () => {
    const state = useAppStore.getState();
    const node1Edges = state.logicalData.edges.filter((e) => e.sourceId === 'node-1');
    expect(node1Edges.length).toBe(2);

    const le1 = state.visualData.layoutEdges['edge-1'];
    const le2 = state.visualData.layoutEdges['edge-2'];
    expect(le1.sourceHandle).toBe('right:50');
    expect(le2.sourceHandle).toBe('right:50');
  });
});
