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
