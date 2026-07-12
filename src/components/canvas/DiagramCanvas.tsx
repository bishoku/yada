import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  Connection,
  NodeChange,
  EdgeChange,
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  reconnectEdge,
} from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { AnimatedEdge } from './AnimatedEdge';
import { SectionNode } from './SectionNode';
import { useAppStore } from '../../store/useAppStore';
import { Trash2 } from 'lucide-react';

import { DragGhost } from './DragGhost';
import { ContextMenu } from './ContextMenu';
import { NodePropertiesPopover } from './NodePropertiesPopover';
import { EdgePropertiesPopover } from './EdgePropertiesPopover';
import { ClearCanvasModal } from './ClearCanvasModal';
import { ConnectionConfirmModal } from './ConnectionConfirmModal';

const nodeTypes = { customNode: BaseNode, sectionNode: SectionNode };
const edgeTypes = { customEdge: AnimatedEdge };

// Helper to map a LogicalNode to a ReactFlow Node
const toRfNode = (ln: any, vn: any): Node => {
  const isSection = ln.type === 'section';
  return {
    id: ln.id,
    type: isSection ? 'sectionNode' : 'customNode',
    position: { x: vn.x ?? 0, y: vn.y ?? 0 },
    data: { name: ln.name, type: ln.type },
    width: vn.width ?? (isSection ? 400 : 224),
    height: vn.height ?? (isSection ? 300 : 52),
    ...(ln.parentId ? { parentId: ln.parentId, extent: 'parent' as const } : {}),
    ...(vn.zIndex != null ? { zIndex: vn.zIndex } : isSection ? { zIndex: -1 } : {}),
    style: isSection ? { width: vn.width ?? 400, height: vn.height ?? 300 } : undefined,
  };
};

const FlowWrapper: React.FC = () => {
  const logicalData = useAppStore((s) => s.logicalData);
  const visualDataRef = useRef(useAppStore.getState().visualData);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      visualDataRef.current = state.visualData;
    });
    return unsub;
  }, []);

  const addNode = useAppStore((s) => s.addNode);
  const updateNodePosition = useAppStore((s) => s.updateNodePosition);
  const zustandAddEdge = useAppStore((s) => s.addEdge);
  const zustandReconnectEdge = useAppStore((s) => s.reconnectEdge);
  const deleteNode = useAppStore((s) => s.deleteNode);
  const deleteEdge = useAppStore((s) => s.deleteEdge);
  const updateCanvasViewport = useAppStore((s) => s.updateCanvasViewport);
  const pendingDrop = useAppStore((s) => s.pendingDrop);
  const cancelDrag = useAppStore((s) => s.cancelDrag);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);
  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const addSequenceStep = useAppStore((s) => s.addSequenceStep);
  const theme = useAppStore((s) => s.theme);
  const clearCanvas = useAppStore((s) => s.clearCanvas);
  const updateNodeDetails = useAppStore((s) => s.updateNodeDetails);
  const pushToHistory = useAppStore((s) => s.pushToHistory);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const layoutVersion = useAppStore((s) => s.layoutVersion);
  const setNodeParent = useAppStore((s: any) => s.setNodeParent);
  const autoResizeSection = useAppStore((s: any) => s.autoResizeSection);

  const { screenToFlowPosition, setCenter } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Context Menu State ─────────────────────────────────────────────────────
  const [menu, setMenu] = useState<{
    id: string;
    type: 'node' | 'edge';
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // ── Pending Connection Modal State ─────────────────────────────────────────
  const [pendingConnection, setPendingConnection] = useState<{
    rfConnection: Connection;
    logicalFrom: string;
    logicalTo: string;
    logicalFromPort: string;
    logicalToPort: string;
  } | null>(null);
  const dragStartRef = useRef<{ nodeId: string; handleId: string } | null>(null);
  const [stepOrderVal, setStepOrderVal] = useState<number>(1);
  const [showClearModal, setShowClearModal] = useState(false);

  // ── Floating Properties Modal States ───────────────────────────────────────
  const [activeNodeProperties, setActiveNodeProperties] = useState<{
    id: string;
    x: number;
    y: number;
    name: string;
    type: string;
    theme: string;
  } | null>(null);

  const [activeEdgeProperties, setActiveEdgeProperties] = useState<{
    id: string;
    x: number;
    y: number;
    protocol: string;
    isAsync: boolean;
    stepNumber: number;
    duration: number;
    delay: number;
    tooltipText: string;
    tooltipDuration: number;
    description?: string;
  } | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, node: Node) => {
    e.stopPropagation();
    closeMenu();
    setActiveEdgeProperties(null);

    const ln = logicalData.nodes.find(n => n.id === node.id);
    const vn = visualDataRef.current.layoutNodes[node.id];
    if (ln) {
      setActiveNodeProperties({
        id: node.id,
        x: e.clientX,
        y: e.clientY,
        name: ln.name,
        type: ln.type,
        theme: vn?.theme ?? 'indigo',
      });
    }
  }, [logicalData.nodes, closeMenu]);

  const handleEdgeDoubleClick = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.stopPropagation();
    closeMenu();
    setActiveNodeProperties(null);

    const le = logicalData.edges.find(e => e.id === edge.id);
    if (le) {
      const seq = logicalData.sequences.find(s => s.edgeId === edge.id);
      const timing = seq ? visualDataRef.current.timelines[seq.id] : null;

      setActiveEdgeProperties({
        id: edge.id,
        x: e.clientX,
        y: e.clientY,
        protocol: le.protocol ?? 'Call',
        isAsync: le.isAsync,
        stepNumber: seq?.stepNumber ?? 1,
        duration: timing?.duration ?? 1000,
        delay: timing?.delay ?? 0,
        tooltipText: timing?.internalProcess?.text ?? '',
        tooltipDuration: timing?.internalProcess?.duration ?? 1000,
        description: le.description ?? '',
      });
    }
  }, [logicalData.edges, logicalData.sequences, closeMenu]);

  // ── Local React Flow state ─────────────────────────────────────────────────
  const [rfNodes, setRfNodes] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges] = useEdgesState<Edge>([]);

  // ── One-time init from store ───────────────────────────────────────────────
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    // Sort: sections first so ReactFlow can resolve parentId references
    const sortedLogical = [...logicalData.nodes].sort((a, b) => {
      const aS = a.type === 'section' ? 0 : 1;
      const bS = b.type === 'section' ? 0 : 1;
      return aS - bS;
    });
    const nodes: Node[] = sortedLogical.map((ln) => {
      const vn = useAppStore.getState().visualData.layoutNodes[ln.id] ?? { x: 0, y: 0 };
      return toRfNode(ln, vn);
    });
    const edges: Edge[] = logicalData.edges.map((le) => ({
      id: le.id,
      type: 'customEdge',
      source: le.from,
      target: le.to,
      sourceHandle: le.fromPort,
      targetHandle: le.toPort,
      reconnectable: true,
    }));
    setRfNodes(nodes);
    setRfEdges(edges);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync node positions on Layout Recalculation / Undo / Redo ──────────────
  useEffect(() => {
    if (layoutVersion === 0) return;
    const state = useAppStore.getState();
    // Sort: sections first
    const sortedLogical = [...state.logicalData.nodes].sort((a, b) => {
      const aS = a.type === 'section' ? 0 : 1;
      const bS = b.type === 'section' ? 0 : 1;
      return aS - bS;
    });
    setRfNodes(() =>
      sortedLogical.map((ln) => {
        const vn = visualDataRef.current.layoutNodes[ln.id] ?? { x: 0, y: 0 };
        return toRfNode(ln, vn);
      })
    );
  }, [layoutVersion, setRfNodes]);

  // ── Sync nodes list when additions or deletions occur (Undo/Redo / Drop) ───
  useEffect(() => {
    setRfNodes((currentNodes) => {
      // 1. Filter out deleted nodes
      const remainingNodes = currentNodes.filter((cn) =>
        logicalData.nodes.some((ln) => ln.id === cn.id)
      );

      // 2. Update existing nodes (parentId, data changes)
      const updatedRemaining = remainingNodes.map((cn) => {
        const ln = logicalData.nodes.find((l) => l.id === cn.id);
        if (!ln) return cn;
        const vn = visualDataRef.current.layoutNodes[ln.id] ?? { x: 0, y: 0 };
        return toRfNode(ln, vn);
      });

      // 3. Add newly created nodes (sections first for parentId resolution)
      const newLogical = logicalData.nodes
        .filter((ln) => !currentNodes.some((cn) => cn.id === ln.id))
        .sort((a, b) => {
          const aS = a.type === 'section' ? 0 : 1;
          const bS = b.type === 'section' ? 0 : 1;
          return aS - bS;
        });
      const newNodes = newLogical.map((ln) => {
        const vn = visualDataRef.current.layoutNodes[ln.id] ?? { x: 0, y: 0 };
        return toRfNode(ln, vn);
      });

      // Sort: sections first in the final array
      const all = [...updatedRemaining, ...newNodes];
      all.sort((a, b) => {
        const aS = a.type === 'sectionNode' ? 0 : 1;
        const bS = b.type === 'sectionNode' ? 0 : 1;
        return aS - bS;
      });
      return all;
    });

    setRfEdges(() =>
      logicalData.edges.map((le) => ({
        id: le.id,
        type: 'customEdge',
        source: le.from,
        target: le.to,
        sourceHandle: le.fromPort,
        targetHandle: le.toPort,
        reconnectable: true,
      }))
    );
  }, [logicalData.nodes, logicalData.edges, setRfNodes, setRfEdges]);

  // ── Bi-directional Zoom/Center Focus on active Sequence/Edge ───────────────
  useEffect(() => {
    if (!selectedSequenceId) return;
    const seq = logicalData.sequences.find((s) => s.id === selectedSequenceId);
    if (!seq) return;

    const edge = logicalData.edges.find((e) => e.id === seq.edgeId);
    if (!edge) return;

    const sourceNode = visualDataRef.current.layoutNodes[edge.from];
    const targetNode = visualDataRef.current.layoutNodes[edge.to];
    if (!sourceNode || !targetNode) return;

    const srcName = logicalData.nodes.find((n) => n.id === edge.from)?.name ?? edge.from;
    const dstName = logicalData.nodes.find((n) => n.id === edge.to)?.name ?? edge.to;
    const centerX = (sourceNode.x + targetNode.x) / 2 + 112;
    const centerY = (sourceNode.y + targetNode.y) / 2 + 24;
    console.log(`[Focus] Zooming to connection: S${seq.stepNumber} (${srcName} → ${dstName}) at (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);
    setCenter(centerX, centerY, { zoom: 1.3, duration: 800 });
  }, [selectedSequenceId, logicalData.edges, logicalData.sequences, setCenter]);

  useEffect(() => {
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [closeMenu]);

  // ── Handle mouseup on the canvas area to place the pending component ───────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleMouseUp = (e: MouseEvent) => {
      const current = useAppStore.getState().pendingDrop;
      if (!current) return;

      const { type, name } = current;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const nodeId = `node-${type}-${Date.now()}`;

      const isSection = type === 'section';
      const width = isSection ? 400 : 224;
      const height = isSection ? 300 : 52;

      const x = position.x - width / 2;
      const y = position.y - height / 2;

      console.log(`[Canvas] Placing "${name}" at flow (${x.toFixed(0)}, ${y.toFixed(0)})`);

      const visualNode = { id: nodeId, x, y, width, height, ...(isSection ? { zIndex: -1 } : {}) };
      const newNode: Node = toRfNode({ id: nodeId, type, name }, visualNode);

      setRfNodes((nds) => isSection ? [newNode, ...nds] : [...nds, newNode]);
      addNode({ id: nodeId, type, name }, visualNode);
      cancelDrag();
    };

    el.addEventListener('mouseup', handleMouseUp);
    return () => el.removeEventListener('mouseup', handleMouseUp);
  }, [screenToFlowPosition, setRfNodes, addNode, cancelDrag]);

  // ── Keyboard Hotkeys: Escape, Undo (Ctrl/Cmd+Z), Redo (Ctrl/Cmd+Y) ──────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useAppStore.getState().pendingDrop) {
        cancelDrag();
      }
      if (e.key === 'Escape') {
        closeMenu();
        setPendingConnection(null);
      }

      // Undo hotkey
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      // Redo hotkey
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDrag, closeMenu, undo, redo]);

  const onNodeDragStart = useCallback(() => {
    pushToHistory();
  }, [pushToHistory]);

  // ── Drag-into-Section Detection ─────────────────────────────────────────
  const onNodeDragStop = useCallback(
    (_event: any, draggedNode: Node) => {
      // Don't parent sections to other sections
      if (draggedNode.type === 'sectionNode') return;

      const state = useAppStore.getState();
      const sections = state.logicalData.nodes.filter(n => n.type === 'section');
      const draggedLogical = state.logicalData.nodes.find(n => n.id === draggedNode.id);
      if (!draggedLogical) return;

      // Get dragged node absolute position
      const dragX = draggedNode.position.x;
      const dragY = draggedNode.position.y;
      const dragW = draggedNode.width ?? 224;
      const dragH = draggedNode.height ?? 52;
      const dragCX = dragX + dragW / 2;
      const dragCY = dragY + dragH / 2;

      // If node already has a parent, the position is relative — convert to absolute for comparison
      let absDragCX = dragCX;
      let absDragCY = dragCY;
      if (draggedLogical.parentId) {
        const parentVisual = state.visualData.layoutNodes[draggedLogical.parentId];
        if (parentVisual) {
          absDragCX = dragCX + parentVisual.x;
          absDragCY = dragCY + parentVisual.y;
        }
      }

      // Find containing section (center of dragged node must be inside section bounds)
      let targetSection: string | null = null;
      for (const sec of sections) {
        if (sec.id === draggedLogical.parentId) {
          // Already a child — check if still inside
          const sv = state.visualData.layoutNodes[sec.id];
          if (sv) {
            const sw = sv.width ?? 400;
            const sh = sv.height ?? 300;
            if (absDragCX >= sv.x && absDragCX <= sv.x + sw && absDragCY >= sv.y && absDragCY <= sv.y + sh) {
              targetSection = sec.id;
              break;
            }
          }
          continue;
        }
        const sv = state.visualData.layoutNodes[sec.id];
        if (!sv) continue;
        const sw = sv.width ?? 400;
        const sh = sv.height ?? 300;
        if (absDragCX >= sv.x && absDragCX <= sv.x + sw && absDragCY >= sv.y && absDragCY <= sv.y + sh) {
          targetSection = sec.id;
          break;
        }
      }

      const currentParent = draggedLogical.parentId ?? null;

      if (targetSection && targetSection !== currentParent) {
        // Entering a new section — convert absolute position to relative
        const sv = state.visualData.layoutNodes[targetSection];
        if (sv) {
          const relX = absDragCX - dragW / 2 - sv.x;
          const relY = absDragCY - dragH / 2 - sv.y;
          updateNodePosition(draggedNode.id, relX, relY);
        }
        setNodeParent(draggedNode.id, targetSection);
        autoResizeSection(targetSection);
      } else if (!targetSection && currentParent) {
        // Leaving section — convert relative position to absolute
        const sv = state.visualData.layoutNodes[currentParent];
        if (sv) {
          const absX = dragX + sv.x;
          const absY = dragY + sv.y;
          updateNodePosition(draggedNode.id, absX, absY);
        }
        setNodeParent(draggedNode.id, null);
      } else if (targetSection && targetSection === currentParent) {
        // Still inside same section — auto-resize
        autoResizeSection(targetSection);
      }
    },
    [updateNodePosition, setNodeParent, autoResizeSection]
  );

  // ── Node changes ──────────────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setRfNodes((nds) => applyNodeChanges(changes, nds));
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position.x, change.position.y);
        } else if (change.type === 'remove') {
          // For section nodes, use deleteSectionWithChoice (handled in context menu)
          // Regular deleteNode for non-section nodes
          const state = useAppStore.getState();
          const node = state.logicalData.nodes.find(n => n.id === change.id);
          if (node?.type === 'section') {
            // Don't delete via keyboard for sections — force context menu
            return;
          }
          deleteNode(change.id);
        }
      });
    },
    [setRfNodes, updateNodePosition, deleteNode]
  );

  // ── Edge changes ──────────────────────────────────────────────────────────
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setRfEdges((eds) => applyEdgeChanges(changes, eds));
      changes.forEach((change) => {
        if (change.type === 'remove') deleteEdge(change.id);
      });
    },
    [setRfEdges, deleteEdge]
  );

  // ── Handle Connection ──────────────────────────────────────────────────────
  const onConnectStart = useCallback(
    (_event: any, params: { nodeId: string | null; handleId: string | null }) => {
      if (params.nodeId && params.handleId) {
        dragStartRef.current = { nodeId: params.nodeId, handleId: params.handleId };
      }
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      
      const nextStepNum = logicalData.sequences.length > 0 
        ? Math.max(...logicalData.sequences.map(s => s.stepNumber)) + 1 
        : 1;
        
      setStepOrderVal(nextStepNum);
      
      let logicalFrom = connection.source;
      let logicalTo = connection.target;
      let logicalFromPort = connection.sourceHandle ?? 'right';
      let logicalToPort = connection.targetHandle ?? 'left';

      if (dragStartRef.current) {
        if (dragStartRef.current.nodeId === connection.target) {
          logicalFrom = connection.target;
          logicalTo = connection.source;
          logicalFromPort = connection.targetHandle ?? 'left';
          logicalToPort = connection.sourceHandle ?? 'right';
        }
      }

      setPendingConnection({
        rfConnection: connection,
        logicalFrom,
        logicalTo,
        logicalFromPort,
        logicalToPort,
      });
    },
    [logicalData.sequences]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!newConnection.source || !newConnection.target) return;
      setRfEdges((els) => reconnectEdge(oldEdge, newConnection, els));
      const fromPort = (newConnection.sourceHandle ?? 'right') as 'top' | 'right' | 'bottom' | 'left';
      const toPort = (newConnection.targetHandle ?? 'left') as 'top' | 'right' | 'bottom' | 'left';
      zustandReconnectEdge(oldEdge.id, newConnection.source, newConnection.target, fromPort, toPort);
    },
    [setRfEdges, zustandReconnectEdge]
  );

  const confirmConnection = useCallback(() => {
    if (!pendingConnection) return;
    const { rfConnection, logicalFrom, logicalTo, logicalFromPort, logicalToPort } = pendingConnection;
    if (!rfConnection.source || !rfConnection.target) return;
    
    const edgeId = `edge-${logicalFrom}-${logicalTo}-${Date.now()}`;
    const newEdge: Edge = {
      id: edgeId,
      type: 'customEdge',
      source: rfConnection.source,
      target: rfConnection.target,
      sourceHandle: rfConnection.sourceHandle ?? undefined,
      targetHandle: rfConnection.targetHandle ?? undefined,
    };
    
    setRfEdges((eds) => addEdge(newEdge, eds));
    
    zustandAddEdge({
      id: edgeId,
      from: logicalFrom,
      to: logicalTo,
      fromPort: logicalFromPort as 'top' | 'right' | 'bottom' | 'left',
      toPort: logicalToPort as 'top' | 'right' | 'bottom' | 'left',
      isAsync: false,
    });

    const seqId = `seq-${Date.now()}`;
    addSequenceStep(
      {
        id: seqId,
        stepNumber: stepOrderVal,
        edgeId: edgeId,
        isAsync: false,
      },
      {
        sequenceId: seqId,
        duration: 1000,
        delay: 0,
      }
    );

    setPendingConnection(null);
  }, [pendingConnection, stepOrderVal, setRfEdges, zustandAddEdge, addSequenceStep]);

  const cancelConnection = useCallback(() => {
    setPendingConnection(null);
  }, []);

  // ── Viewport ───────────────────────────────────────────────────────────────
  const onMoveEnd = useCallback(
    (_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
      updateCanvasViewport(viewport.zoom, { x: viewport.x, y: viewport.y });
    },
    [updateCanvasViewport]
  );

  // ── Context Menu Actions ───────────────────────────────────────────────────
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      event.stopPropagation();
      setMenu({
        id: node.id,
        type: 'node',
        x: event.clientX,
        y: event.clientY,
        label: (node.data as any)?.name ?? node.id,
      });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      
      const srcNode = rfNodes.find(n => n.id === edge.source);
      const dstNode = rfNodes.find(n => n.id === edge.target);
      const srcLabel = (srcNode?.data as any)?.name ?? edge.source;
      const dstLabel = (dstNode?.data as any)?.name ?? edge.target;

      setMenu({
        id: edge.id,
        type: 'edge',
        x: event.clientX,
        y: event.clientY,
        label: `${srcLabel} → ${dstLabel}`,
      });
    },
    [rfNodes]
  );

  const handleDeleteElement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menu) return;
    if (menu.type === 'node') {
      setRfNodes((nds) => nds.filter((n) => n.id !== menu.id));
      setRfEdges((eds) => eds.filter((e) => e.source !== menu.id && e.target !== menu.id));
      deleteNode(menu.id);
    } else {
      setRfEdges((eds) => eds.filter((e) => e.id !== menu.id));
      deleteEdge(menu.id);
    }
    closeMenu();
  }, [menu, setRfNodes, setRfEdges, deleteNode, deleteEdge, closeMenu]);

  // Two-way binding: select sequence when connection edge is clicked in canvas
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    const seq = logicalData.sequences.find(s => s.edgeId === edge.id);
    if (seq) {
      setSelectedSequenceId(seq.id);
    } else {
      setSelectedSequenceId(null);
    }
  }, [logicalData.sequences, setSelectedSequenceId]);

  const onPaneClick = useCallback(() => {
    closeMenu();
    setSelectedSequenceId(null);
    setActiveNodeProperties(null);
    setActiveEdgeProperties(null);
  }, [closeMenu, setSelectedSequenceId]);

  // Lookup node names for the connection modal label
  const connectionSrcName = pendingConnection
    ? (rfNodes.find(n => n.id === pendingConnection.logicalFrom)?.data as any)?.name ?? pendingConnection.logicalFrom
    : '';
  const connectionDstName = pendingConnection
    ? (rfNodes.find(n => n.id === pendingConnection.logicalTo)?.data as any)?.name ?? pendingConnection.logicalTo
    : '';

  // Callback from Node properties to update local React Flow view state immediately
  const handleApplyNodeProperties = useCallback((id: string, name: string, type: string, themeColor: string) => {
    updateNodeDetails(id, name, type, themeColor);
    setRfNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                name,
                type,
              },
            }
          : n
      )
    );
    setActiveNodeProperties(null);
  }, [updateNodeDetails, setRfNodes]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: pendingDrop ? 'crosshair' : undefined,
      }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onReconnect={onReconnect}
        onMoveEnd={onMoveEnd}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onMoveStart={() => {
          closeMenu();
          setActiveNodeProperties(null);
          setActiveEdgeProperties(null);
        }}
        onNodeDoubleClick={handleNodeDoubleClick}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        className="w-full h-full"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color={theme === 'dark' ? '#334155' : '#cbd5e1'}
          gap={16}
        />
        <Controls className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md font-sans" />
        <MiniMap 
          position="bottom-left" 
          style={{ 
            background: theme === 'dark' ? '#0f172a' : '#ffffff', 
            border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0', 
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }} 
          zoomable 
          pannable 
        />
      </ReactFlow>

      {/* Floating Clear Canvas Button (Bottom Right) */}
      <div className="absolute bottom-4 right-14 z-40 flex items-center">
        <button
          onClick={() => setShowClearModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 shadow-md transition-all active:scale-95 cursor-pointer font-sans"
          title={theme === 'dark' ? 'Tüm Tuvali Temizle' : 'Clear Canvas'}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{theme === 'dark' ? 'Temizle' : 'Clear All'}</span>
        </button>
      </div>

      {/* Floating Properties Panel: Düğüm (Node) */}
      <NodePropertiesPopover
        properties={activeNodeProperties}
        onClose={() => setActiveNodeProperties(null)}
        onApply={handleApplyNodeProperties}
      />

      {/* Floating Properties Panel: Bağlantı (Edge) */}
      <EdgePropertiesPopover
        properties={activeEdgeProperties}
        onClose={() => setActiveEdgeProperties(null)}
      />

      {/* Clear Canvas Confirmation Modal */}
      <ClearCanvasModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => {
          clearCanvas();
          setRfNodes([]);
          setRfEdges([]);
          setShowClearModal(false);
        }}
      />

      {/* Context Menu Overlay */}
      <ContextMenu
        menu={menu}
        onClose={closeMenu}
        onDelete={handleDeleteElement}
      />

      {/* Step Order Popup Modal on Connection */}
      <ConnectionConfirmModal
        pendingConnection={pendingConnection}
        stepOrderVal={stepOrderVal}
        setStepOrderVal={setStepOrderVal}
        connectionSrcName={connectionSrcName}
        connectionDstName={connectionDstName}
        onConfirm={confirmConnection}
        onCancel={cancelConnection}
      />
    </div>
  );
};

export const DiagramCanvas: React.FC = () => (
  <div style={{ width: '100%', height: '100%' }}>
    <ReactFlowProvider>
      <FlowWrapper />
      <DragGhost />
    </ReactFlowProvider>
  </div>
);
