import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';

describe('Canvas Multi-Selection Alignment & Distribution', () => {
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
        ],
        edges: [
          { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', isAsync: false },
        ],
        sequences: [
          { id: 'seq-1', edgeId: 'edge-1', stepNumber: 1, isAsync: false },
        ],
      },
      visualData: {
        canvas: { zoom: 1, pan: { x: 0, y: 0 } },
        layoutNodes: {
          'node-1': { id: 'node-1', x: 50, y: 100, width: 200, height: 50 },
          'node-2': { id: 'node-2', x: 300, y: 220, width: 200, height: 50 },
          'node-3': { id: 'node-3', x: 600, y: 160, width: 200, height: 50 },
        },
        layoutEdges: {},
        timelines: {},
      },
    });
  });

  it('aligns nodes to the left and increments layoutVersion', () => {
    const { alignSelectedNodes } = useAppStore.getState();
    const initialVersion = useAppStore.getState().layoutVersion;

    alignSelectedNodes(['node-1', 'node-2', 'node-3'], 'left');

    const state = useAppStore.getState();
    expect(state.layoutVersion).toBe(initialVersion + 1);
    expect(state.visualData.layoutNodes['node-1'].x).toBe(50);
    expect(state.visualData.layoutNodes['node-2'].x).toBe(50);
    expect(state.visualData.layoutNodes['node-3'].x).toBe(50);
  });

  it('aligns nodes to the top', () => {
    const { alignSelectedNodes } = useAppStore.getState();

    alignSelectedNodes(['node-1', 'node-2'], 'top');

    const state = useAppStore.getState();
    expect(state.visualData.layoutNodes['node-1'].y).toBe(100);
    expect(state.visualData.layoutNodes['node-2'].y).toBe(100);
  });

  it('aligns nodes to the right edge based on widths', () => {
    const { alignSelectedNodes } = useAppStore.getState();

    alignSelectedNodes(['node-1', 'node-2'], 'right');

    const state = useAppStore.getState();
    expect(state.visualData.layoutNodes['node-1'].x).toBe(300);
    expect(state.visualData.layoutNodes['node-2'].x).toBe(300);
  });

  it('distributes nodes horizontally with equal spacing', () => {
    const { distributeSelectedNodes } = useAppStore.getState();

    distributeSelectedNodes(['node-1', 'node-2', 'node-3'], 'horizontal');

    const state = useAppStore.getState();
    const x1 = state.visualData.layoutNodes['node-1'].x;
    const x2 = state.visualData.layoutNodes['node-2'].x;
    const x3 = state.visualData.layoutNodes['node-3'].x;

    expect(x1).toBe(50);
    expect(x3).toBe(600);
    const gap1 = x2 - (x1 + 200);
    const gap2 = x3 - (x2 + 200);
    expect(Math.abs(gap1 - gap2)).toBeLessThanOrEqual(1);
  });

  it('correctly handles undo of alignment', () => {
    const { alignSelectedNodes, undo } = useAppStore.getState();

    alignSelectedNodes(['node-1', 'node-2'], 'left');
    expect(useAppStore.getState().visualData.layoutNodes['node-2'].x).toBe(50);

    undo();
    expect(useAppStore.getState().visualData.layoutNodes['node-2'].x).toBe(300);
  });

  it('aligns nodes nested inside a section using absolute coordinate resolution', () => {
    useAppStore.setState({
      logicalData: {
        schemaVersion: 2,
        nodes: [
          { id: 'sec-1', type: 'section', name: 'Section' },
          { id: 'child-1', type: 'service', name: 'Child 1', parentId: 'sec-1' },
          { id: 'root-1', type: 'service', name: 'Root 1' },
        ],
        edges: [],
        sequences: [],
      },
      visualData: {
        canvas: { zoom: 1, pan: { x: 0, y: 0 } },
        layoutNodes: {
          'sec-1': { id: 'sec-1', x: 200, y: 200, width: 400, height: 300 },
          'child-1': { id: 'child-1', x: 20, y: 30, width: 150, height: 50 },
          'root-1': { id: 'root-1', x: 50, y: 100, width: 150, height: 50 },
        },
        layoutEdges: {},
        timelines: {},
      },
    });

    const { alignSelectedNodes } = useAppStore.getState();
    alignSelectedNodes(['child-1', 'root-1'], 'top');

    const state = useAppStore.getState();
    expect(state.visualData.layoutNodes['root-1'].y).toBe(100);
    expect(state.visualData.layoutNodes['child-1'].y).toBe(-100);
  });

  it('deletes selected nodes and cascading edges while incrementing layoutVersion', () => {
    const { deleteSelectedNodes } = useAppStore.getState();
    const initialVersion = useAppStore.getState().layoutVersion;

    deleteSelectedNodes(['node-1']);

    const state = useAppStore.getState();
    expect(state.layoutVersion).toBe(initialVersion + 1);
    expect(state.logicalData.nodes.find(n => n.id === 'node-1')).toBeUndefined();
    expect(state.logicalData.edges.find(e => e.id === 'edge-1')).toBeUndefined();
    expect(state.logicalData.sequences.length).toBe(0);
    expect(state.visualData.layoutNodes['node-1']).toBeUndefined();
  });
});
