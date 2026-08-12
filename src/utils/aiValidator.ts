import { LogicalDiagram, VisualDiagram, LogicalNode, LogicalEdge, SequenceStep } from '../types';

/**
 * Validates and repairs the LLM-generated JSON payload.
 * Prevents the application from crashing due to malformed, incomplete, or referentially broken data.
 */
export function validateAndRepairAiPayload(
  logicalPayload: any,
  visualPayload: any
): { safeLogical: LogicalDiagram; safeVisual: VisualDiagram } {
  
  // ---------------------------------------------------------
  // 1. STRUCTURAL INTEGRITY & DEFAULTS
  // ---------------------------------------------------------
  const safeLogical: LogicalDiagram = {
    schemaVersion: 2,
    nodes: Array.isArray(logicalPayload?.nodes) ? logicalPayload.nodes : [],
    edges: Array.isArray(logicalPayload?.edges) ? logicalPayload.edges : [],
    sequences: Array.isArray(logicalPayload?.sequences) ? logicalPayload.sequences : [],
  };

  const safeVisual: VisualDiagram = {
    canvas: visualPayload?.canvas || { zoom: 1, pan: { x: 0, y: 0 }, gridVisible: true },
    layoutNodes: (visualPayload?.layoutNodes && typeof visualPayload.layoutNodes === 'object') ? visualPayload.layoutNodes : {},
    layoutEdges: (visualPayload?.layoutEdges && typeof visualPayload.layoutEdges === 'object') ? visualPayload.layoutEdges : {},
    timelines: (visualPayload?.timelines && typeof visualPayload.timelines === 'object') ? visualPayload.timelines : {},
    annotations: (visualPayload?.annotations && typeof visualPayload.annotations === 'object') ? visualPayload.annotations : {},
  };

  // ---------------------------------------------------------
  // 2. REFERENTIAL INTEGRITY (LOGICAL LAYER)
  // ---------------------------------------------------------
  
  // Create a fast lookup set for nodes
  const nodeIds = new Set<string>();
  safeLogical.nodes.forEach((node: LogicalNode) => {
    if (node && node.id) {
      nodeIds.add(node.id);
    }
  });

  // Filter edges: keep only those whose sourceId and targetId exist in nodes
  safeLogical.edges = safeLogical.edges.filter((edge: LogicalEdge) => {
    if (!edge || !edge.id || !edge.sourceId || !edge.targetId) return false;
    return nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId);
  });

  // Fast lookup for valid edges
  const edgeIds = new Set<string>();
  safeLogical.edges.forEach((edge: LogicalEdge) => {
    edgeIds.add(edge.id);
  });

  // Filter sequences: keep only those whose edgeId exists in valid edges
  safeLogical.sequences = safeLogical.sequences.filter((seq: SequenceStep) => {
    if (!seq || !seq.id || !seq.edgeId) return false;
    return edgeIds.has(seq.edgeId);
  });

  // ---------------------------------------------------------
  // 3. LOGICAL-TO-VISUAL SYNCHRONIZATION
  // ---------------------------------------------------------
  
  // 3a. Ensure every logical node has a visual layout node
  safeLogical.nodes.forEach((node: LogicalNode) => {
    if (!safeVisual.layoutNodes[node.id]) {
      // Missing visual data! Create a default fallback.
      safeVisual.layoutNodes[node.id] = {
        id: node.id,
        x: 0,
        y: 0,
        width: node.type === 'section' ? 400 : 224,
        height: node.type === 'section' ? 300 : 52,
        theme: 'slate',
        zIndex: node.type === 'section' ? -1 : 0,
      };
    }
  });

  // 3b. Ensure every visual annotation has a layout node (sticky notes are purely visual)
  Object.keys(safeVisual.annotations || {}).forEach((noteId) => {
    if (!safeVisual.layoutNodes[noteId]) {
      safeVisual.layoutNodes[noteId] = {
        id: noteId,
        x: 50,
        y: 50,
        width: 220,
        height: 160,
      };
    }
  });

  // 3c. Ensure every logical edge has a visual layout edge
  safeLogical.edges.forEach((edge: LogicalEdge) => {
    if (!safeVisual.layoutEdges[edge.id]) {
      // Missing visual data! Create a default fallback.
      safeVisual.layoutEdges[edge.id] = {
        id: edge.id,
        sourceHandle: 'right:50',
        targetHandle: 'left:50',
        particleType: 'dot',
        showArrow: true,
      };
    }
  });

  // 3c. Ensure every sequence step has a timeline timing
  safeLogical.sequences.forEach((seq: SequenceStep) => {
    if (!safeVisual.timelines[seq.id]) {
      // Missing timing data! Create a default fallback.
      safeVisual.timelines[seq.id] = {
        sequenceId: seq.id,
        duration: 1000,
        delay: 0,
        animationMode: 'normal',
      };
    }
  });

  return { safeLogical, safeVisual };
}
