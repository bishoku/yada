import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';

/**
 * Arranges React Flow nodes hierarchically using Dagre library.
 * direction: 'TB' (Top-to-Bottom) or 'LR' (Left-to-Right)
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): Node[] => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure layout settings
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80, // Horizontal space between adjacent nodes
    ranksep: 100, // Vertical separation between hierarchical levels
    marginx: 50,
    marginy: 50,
  });

  // Load nodes into Dagre graph
  nodes.forEach((node) => {
    // Default node size is 224x52 matching standard cards
    dagreGraph.setNode(node.id, {
      width: node.width ?? 224,
      height: node.height ?? 52,
    });
  });

  // Load edges into Dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Compute Dagre layout
  dagre.layout(dagreGraph);

  // Return new React Flow nodes with updated layout coordinates
  return nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    const nodeW = node.width ?? 224;
    const nodeH = node.height ?? 52;

    return {
      ...node,
      position: {
        // Dagre centers coordinates (x,y), so we offset by half dimensions
        x: Math.round(dagreNode.x - nodeW / 2),
        y: Math.round(dagreNode.y - nodeH / 2),
      },
    };
  });
};

/** Shared by the toolbar and topology-code commits. Child positions remain local. */
export function layoutDiagram(
  logical: import('../types').LogicalDiagram,
  visual: import('../types').VisualDiagram,
  direction: 'LR' | 'TB' = 'LR',
): import('../types').VisualDiagram {
  const {nodes, edges} = logical;
  const parentMap = new Map(nodes.map(node => [node.id, node.parentId]));
  const root = (id: string): string => {
    const seen = new Set<string>();
    while (parentMap.get(id) && !seen.has(id)) { seen.add(id); id = parentMap.get(id)!; }
    return id;
  };
  const topLevel = nodes.filter(node => !node.parentId).map(node => ({
    id: node.id,
    position: {x: visual.layoutNodes[node.id]?.x ?? 0, y: visual.layoutNodes[node.id]?.y ?? 0},
    data: {name: node.name, type: node.type},
    width: visual.layoutNodes[node.id]?.width ?? (node.type === 'section' ? 400 : 224),
    height: visual.layoutNodes[node.id]?.height ?? (node.type === 'section' ? 300 : 52),
  }));
  const mappedEdges = edges.map(edge => ({id: edge.id, source: root(edge.sourceId), target: root(edge.targetId)}))
    .filter(edge => edge.source !== edge.target);
  const layoutNodes = {...visual.layoutNodes};
  getLayoutedElements(topLevel, mappedEdges, direction).forEach(node => {
    layoutNodes[node.id] = {...layoutNodes[node.id], id: node.id, x: node.position.x, y: node.position.y};
  });
  const layoutEdges = {...visual.layoutEdges};
  edges.forEach(edge => {
    if (parentMap.get(edge.sourceId) && root(edge.sourceId) === root(edge.targetId)) return;
    layoutEdges[edge.id] = {...layoutEdges[edge.id], id: edge.id, sourceHandle: direction === 'TB' ? 'bottom:50' : 'right:50', targetHandle: direction === 'TB' ? 'top:50' : 'left:50'};
  });
  return {...visual, layoutNodes, layoutEdges, autoLayoutDirection: direction};
}
