import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';
import {
  getNodeAbsolutePosition,
  getNodeDepth,
  isDescendantOf,
  findDeepestContainingSection,
} from '../../components/canvas/hooks/sectionHierarchyUtils';

describe('Nested Sections & Reparenting Hierarchy', () => {
  beforeEach(() => {
    useAppStore.setState({
      pastStates: [],
      futureStates: [],
      layoutVersion: 0,
      logicalData: {
        schemaVersion: 2,
        nodes: [
          // Level 0: Region
          { id: 'sec-region', type: 'section', name: 'Region' },
          // Level 1: VPC (child of Region)
          { id: 'sec-vpc', type: 'section', name: 'VPC', parentId: 'sec-region' },
          // Level 2: Subnet (child of VPC)
          { id: 'sec-subnet', type: 'section', name: 'Subnet', parentId: 'sec-vpc' },
          // Leaf node inside Subnet (Level 3)
          { id: 'node-app', type: 'service', name: 'App Service', parentId: 'sec-subnet' },
          // Leaf node at canvas root (Level 0)
          { id: 'node-ext', type: 'service', name: 'External Client' },
        ],
        edges: [],
        sequences: [],
      },
      visualData: {
        canvas: { zoom: 1, pan: { x: 0, y: 0 } },
        layoutNodes: {
          'sec-region': { id: 'sec-region', x: 100, y: 100, width: 800, height: 600 },
          'sec-vpc': { id: 'sec-vpc', x: 40, y: 50, width: 600, height: 450 },
          'sec-subnet': { id: 'sec-subnet', x: 30, y: 40, width: 400, height: 300 },
          'node-app': { id: 'node-app', x: 20, y: 30, width: 200, height: 50 },
          'node-ext': { id: 'node-ext', x: 50, y: 50, width: 200, height: 50 },
        },
        layoutEdges: {},
        timelines: {},
      },
    });
  });

  it('calculates recursive canvas-absolute positions accurately', () => {
    const state = useAppStore.getState();
    const logicalNodes = state.logicalData.nodes;
    const layoutNodes = state.visualData.layoutNodes;

    // sec-region is at (100, 100)
    const regionAbs = getNodeAbsolutePosition('sec-region', logicalNodes, layoutNodes);
    expect(regionAbs).toEqual({ x: 100, y: 100 });

    // sec-vpc is at (100 + 40, 100 + 50) = (140, 150)
    const vpcAbs = getNodeAbsolutePosition('sec-vpc', logicalNodes, layoutNodes);
    expect(vpcAbs).toEqual({ x: 140, y: 150 });

    // sec-subnet is at (140 + 30, 150 + 40) = (170, 190)
    const subnetAbs = getNodeAbsolutePosition('sec-subnet', logicalNodes, layoutNodes);
    expect(subnetAbs).toEqual({ x: 170, y: 190 });

    // node-app is at (170 + 20, 190 + 30) = (190, 220)
    const appAbs = getNodeAbsolutePosition('node-app', logicalNodes, layoutNodes);
    expect(appAbs).toEqual({ x: 190, y: 220 });

    // node-ext is at (50, 50)
    const extAbs = getNodeAbsolutePosition('node-ext', logicalNodes, layoutNodes);
    expect(extAbs).toEqual({ x: 50, y: 50 });
  });

  it('computes correct hierarchy depth for nested nodes', () => {
    const logicalNodes = useAppStore.getState().logicalData.nodes;

    expect(getNodeDepth('sec-region', logicalNodes)).toBe(0);
    expect(getNodeDepth('sec-vpc', logicalNodes)).toBe(1);
    expect(getNodeDepth('sec-subnet', logicalNodes)).toBe(2);
    expect(getNodeDepth('node-app', logicalNodes)).toBe(3);
    expect(getNodeDepth('node-ext', logicalNodes)).toBe(0);
  });

  it('correctly detects descendants to prevent circular parenting', () => {
    const logicalNodes = useAppStore.getState().logicalData.nodes;

    // sec-subnet is descendant of sec-vpc and sec-region
    expect(isDescendantOf('sec-subnet', 'sec-vpc', logicalNodes)).toBe(true);
    expect(isDescendantOf('sec-subnet', 'sec-region', logicalNodes)).toBe(true);

    // sec-region is NOT descendant of sec-subnet
    expect(isDescendantOf('sec-region', 'sec-subnet', logicalNodes)).toBe(false);

    // node-app is descendant of sec-subnet, sec-vpc, sec-region
    expect(isDescendantOf('node-app', 'sec-subnet', logicalNodes)).toBe(true);
    expect(isDescendantOf('node-app', 'sec-region', logicalNodes)).toBe(true);
  });

  it('finds the deepest containing section when sections overlap', () => {
    const state = useAppStore.getState();
    const logicalNodes = state.logicalData.nodes;
    const layoutNodes = state.visualData.layoutNodes;

    // (200, 250) is inside sec-subnet (170..570, 190..490), sec-vpc (140..740, 150..600), and sec-region (100..900, 100..700)
    // Deepest is sec-subnet
    const deepest1 = findDeepestContainingSection({ x: 200, y: 250 }, logicalNodes, layoutNodes);
    expect(deepest1).toBe('sec-subnet');

    // (650, 250) is outside sec-subnet (ends at 570), but inside sec-vpc (ends at 740) and sec-region
    // Deepest is sec-vpc
    const deepest2 = findDeepestContainingSection({ x: 650, y: 250 }, logicalNodes, layoutNodes);
    expect(deepest2).toBe('sec-vpc');

    // (780, 250) is outside sec-vpc (ends at 740), but inside sec-region (ends at 900)
    // Deepest is sec-region
    const deepest3 = findDeepestContainingSection({ x: 780, y: 250 }, logicalNodes, layoutNodes);
    expect(deepest3).toBe('sec-region');

    // (50, 50) is outside all sections
    const deepest4 = findDeepestContainingSection({ x: 50, y: 50 }, logicalNodes, layoutNodes);
    expect(deepest4).toBeNull();
  });

  it('reparents node and updates parentId correctly in store', () => {
    const { setNodeParent, updateNodePosition } = useAppStore.getState();

    // Move node-ext from root canvas into sec-subnet
    updateNodePosition('node-ext', 10, 10);
    setNodeParent('node-ext', 'sec-subnet');

    const updatedState = useAppStore.getState();
    const node = updatedState.logicalData.nodes.find(n => n.id === 'node-ext');
    expect(node?.parentId).toBe('sec-subnet');
  });

  it('recursively auto-resizes parent sections when child grows', () => {
    const { autoResizeSection } = useAppStore.getState();

    // Place a child node near the boundary of sec-subnet
    useAppStore.setState((s) => ({
      visualData: {
        ...s.visualData,
        layoutNodes: {
          ...s.visualData.layoutNodes,
          'node-app': { id: 'node-app', x: 380, y: 280, width: 200, height: 50 },
        },
      },
    }));

    autoResizeSection('sec-subnet');

    const state = useAppStore.getState();
    const subnetV = state.visualData.layoutNodes['sec-subnet'];
    // Subnet needs at least maxX (380+200=580) + PADDING (40) = 620
    expect(subnetV.width).toBeGreaterThanOrEqual(620);
  });
});
