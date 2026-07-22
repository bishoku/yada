import { useEffect, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';
import { toRfNode } from './utils';

const buildRfNodesFromState = (logicalData: any, visualData: any): Node[] => {
  const sortedLogical = [...(logicalData.nodes || [])].sort((a, b) => {
    const aS = a.type === 'section' ? 0 : 1;
    const bS = b.type === 'section' ? 0 : 1;
    return aS - bS;
  });

  const logicalRfNodes: Node[] = sortedLogical.map((ln) => {
    const vn = visualData.layoutNodes[ln.id] ?? { x: 0, y: 0 };
    return toRfNode(ln, vn);
  });

  const annotations = visualData.annotations || {};
  const stickyRfNodes: Node[] = Object.keys(annotations).map((noteId) => {
    const vn = visualData.layoutNodes[noteId] ?? { x: 50, y: 50, width: 220, height: 160 };
    const ann = annotations[noteId];
    return toRfNode({ id: noteId, type: 'sticky_note', name: ann?.header || 'Sticky Note' }, vn);
  });

  const all = [...logicalRfNodes, ...stickyRfNodes];
  all.sort((a, b) => {
    const aS = a.type === 'sectionNode' ? 0 : 1;
    const bS = b.type === 'sectionNode' ? 0 : 1;
    return aS - bS;
  });
  return all;
};

export const useCanvasSync = (
  setRfNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setRfEdges: React.Dispatch<React.SetStateAction<Edge[]>>
) => {
  const layoutVersion = useAppStore((s) => s.layoutVersion);
  const visualDataRef = useRef(useAppStore.getState().visualData);
  const logicalDataRef = useRef(useAppStore.getState().logicalData);

  // Sync refs with store to avoid unnecessary dependency triggers
  // Also reactively sync ReactFlow state when logical nodes/edges or visual annotations change
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      visualDataRef.current = state.visualData;
      logicalDataRef.current = state.logicalData;

      const nodesChanged =
        state.logicalData.nodes !== prevState.logicalData.nodes ||
        state.visualData.annotations !== prevState.visualData.annotations;

      if (nodesChanged) {
        setRfNodes(() => buildRfNodesFromState(state.logicalData, state.visualData));
      }

      if (
        state.logicalData.edges !== prevState.logicalData.edges ||
        state.visualData.layoutEdges !== prevState.visualData.layoutEdges
      ) {
        setTimeout(() => {
          const freshState = useAppStore.getState();
          setRfEdges(() =>
            freshState.logicalData.edges.map((le) => {
              const ve = freshState.visualData.layoutEdges[le.id];
              return {
                id: le.id,
                type: 'customEdge',
                source: le.sourceId,
                target: le.targetId,
                sourceHandle: ve?.sourceHandle ? `${ve.sourceHandle}-source` : undefined,
                targetHandle: ve?.targetHandle ? `${ve.targetHandle}-target` : undefined,
                reconnectable: true,
              };
            })
          );
        }, 50);
      }
    });
    return unsub;
  }, [setRfNodes, setRfEdges]);

  const initialised = useRef(false);

  // ── One-time init from store ───────────────────────────────────────────────
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    
    const state = useAppStore.getState();
    const nodes = buildRfNodesFromState(state.logicalData, state.visualData);
    
    const edges: Edge[] = state.logicalData.edges.map((le) => {
      const ve = state.visualData.layoutEdges[le.id];
      return {
        id: le.id,
        type: 'customEdge',
        source: le.sourceId,
        target: le.targetId,
        sourceHandle: ve?.sourceHandle ? `${ve.sourceHandle}-source` : undefined,
        targetHandle: ve?.targetHandle ? `${ve.targetHandle}-target` : undefined,
        reconnectable: true,
      };
    });
    
    setRfNodes(nodes);
    setTimeout(() => {
      setRfEdges(edges);
    }, 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync node positions on Layout Recalculation / Undo / Redo ──────────────
  useEffect(() => {
    if (layoutVersion === 0) return;
    const state = useAppStore.getState();
    setRfNodes(() => buildRfNodesFromState(state.logicalData, visualDataRef.current));
  }, [layoutVersion, setRfNodes]);

  return { visualDataRef };
};
