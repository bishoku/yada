import { LogicalDiagram, VisualDiagram, VisualNode, VisualEdge } from '../types';
import { getLayoutedElements } from '../utils/layout';

/**
 * Generates a VisualDiagram with auto-layout coordinates from a LogicalDiagram.
 * This is used to hydrate imported data that lacks coordinate (x,y) information.
 */
export const generateLayout = (
  logicalData: LogicalDiagram,
  baseVisualData: Partial<VisualDiagram> = {},
  direction: 'TB' | 'LR' = 'LR'
): VisualDiagram => {
  const { nodes, edges } = logicalData;

  // Convert logical nodes to reactflow-compatible objects for Dagre
  const rfNodes = nodes.map(n => ({
    id: n.id,
    position: { x: 0, y: 0 }, // Initial
    data: { name: n.name, type: n.type },
    width: 224,
    height: 52
  }));

  // Convert logical edges to reactflow-compatible objects for Dagre
  const rfEdges = edges.map(e => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId
  }));

  // Run the layout algorithm
  const layoutedNodes = getLayoutedElements(rfNodes, rfEdges, direction);

  // Map back to VisualNode map
  const layoutNodes: Record<string, VisualNode> = {};
  layoutedNodes.forEach(rn => {
    layoutNodes[rn.id] = {
      id: rn.id,
      x: rn.position.x,
      y: rn.position.y,
      width: rn.width,
      height: rn.height,
      zIndex: 1, // Default zIndex
      theme: 'blue' // Default theme
    };
  });

  // Map edges to VisualEdge map
  const layoutEdges: Record<string, VisualEdge> = {};
  edges.forEach(e => {
    layoutEdges[e.id] = {
      id: e.id,
      sourceHandle: direction === 'LR' ? 'right:50' : 'bottom:50',
      targetHandle: direction === 'LR' ? 'left:50' : 'top:50',
      showArrow: true,
    };
  });

  return {
    canvas: {
      zoom: 1,
      pan: { x: 0, y: 0 },
      gridVisible: true,
      ...(baseVisualData.canvas || {}),
    },
    layoutNodes,
    layoutEdges,
    timelines: baseVisualData.timelines || {},
  };
};
