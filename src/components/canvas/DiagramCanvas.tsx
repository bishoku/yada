import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
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
} from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { AnimatedEdge } from './AnimatedEdge';
import { useAppStore } from '../../store/useAppStore';
import { Trash2 } from 'lucide-react';

import { DragGhost } from './DragGhost';
import { ContextMenu } from './ContextMenu';
import { NodePropertiesPopover } from './NodePropertiesPopover';
import { EdgePropertiesPopover } from './EdgePropertiesPopover';
import { ClearCanvasModal } from './ClearCanvasModal';
import { ConnectionConfirmModal } from './ConnectionConfirmModal';

const nodeTypes = { customNode: BaseNode };
const edgeTypes = { customEdge: AnimatedEdge };

const FlowWrapper: React.FC = () => {
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const addNode = useAppStore((s) => s.addNode);
  const updateNodePosition = useAppStore((s) => s.updateNodePosition);
  const zustandAddEdge = useAppStore((s) => s.addEdge);
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
  } | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, node: Node) => {
    e.stopPropagation();
    closeMenu();
    setActiveEdgeProperties(null);

    const ln = logicalData.nodes.find(n => n.id === node.id);
    const vn = visualData.layoutNodes[node.id];
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
  }, [logicalData.nodes, visualData.layoutNodes, closeMenu]);

  const handleEdgeDoubleClick = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.stopPropagation();
    closeMenu();
    setActiveNodeProperties(null);

    const le = logicalData.edges.find(e => e.id === edge.id);
    if (le) {
      const seq = logicalData.sequences.find(s => s.edgeId === edge.id);
      const timing = seq ? visualData.timelines[seq.id] : null;

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
      });
    }
  }, [logicalData.edges, logicalData.sequences, visualData.timelines, closeMenu]);

  // ── Local React Flow state ─────────────────────────────────────────────────
  const [rfNodes, setRfNodes] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges] = useEdgesState<Edge>([]);

  // ── One-time init from store ───────────────────────────────────────────────
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const nodes: Node[] = logicalData.nodes.map((ln) => {
      const vn = visualData.layoutNodes[ln.id] ?? { x: 0, y: 0 };
      return {
        id: ln.id,
        type: 'customNode',
        position: { x: vn.x, y: vn.y },
        data: { name: ln.name, type: ln.type },
        width: vn.width ?? 224,
        height: vn.height ?? 52,
      };
    });
    const edges: Edge[] = logicalData.edges.map((le) => ({
      id: le.id,
      type: 'customEdge',
      source: le.from,
      target: le.to,
      sourceHandle: le.fromPort,
      targetHandle: le.toPort,
    }));
    setRfNodes(nodes);
    setRfEdges(edges);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bi-directional Zoom/Center Focus on active Sequence/Edge ───────────────
  useEffect(() => {
    if (!selectedSequenceId) return;
    const seq = logicalData.sequences.find((s) => s.id === selectedSequenceId);
    if (!seq) return;

    const edge = logicalData.edges.find((e) => e.id === seq.edgeId);
    if (!edge) return;

    const sourceNode = visualData.layoutNodes[edge.from];
    const targetNode = visualData.layoutNodes[edge.to];
    if (!sourceNode || !targetNode) return;

    const srcName = logicalData.nodes.find((n) => n.id === edge.from)?.name ?? edge.from;
    const dstName = logicalData.nodes.find((n) => n.id === edge.to)?.name ?? edge.to;
    const centerX = (sourceNode.x + targetNode.x) / 2 + 112;
    const centerY = (sourceNode.y + targetNode.y) / 2 + 24;
    console.log(`[Focus] Zooming to connection: S${seq.stepNumber} (${srcName} → ${dstName}) at (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);
    setCenter(centerX, centerY, { zoom: 1.3, duration: 800 });
  }, [selectedSequenceId, logicalData.edges, logicalData.sequences, visualData.layoutNodes, setCenter]);

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
      const x = position.x - 112;
      const y = position.y - 25;

      console.log(`[Canvas] Placing "${name}" at flow (${x.toFixed(0)}, ${y.toFixed(0)})`);

      const newNode: Node = {
        id: nodeId,
        type: 'customNode',
        position: { x, y },
        data: { name, type },
        width: 224,
        height: 52,
      };

      setRfNodes((nds) => [...nds, newNode]);
      addNode({ id: nodeId, type, name }, { id: nodeId, x, y, width: 224, height: 52 });
      cancelDrag();
    };

    el.addEventListener('mouseup', handleMouseUp);
    return () => el.removeEventListener('mouseup', handleMouseUp);
  }, [screenToFlowPosition, setRfNodes, addNode, cancelDrag]);

  // ── Cancel drag on Escape key ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useAppStore.getState().pendingDrop) {
        cancelDrag();
      }
      if (e.key === 'Escape') {
        closeMenu();
        setPendingConnection(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDrag, closeMenu]);

  // ── Node changes ──────────────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setRfNodes((nds) => applyNodeChanges(changes, nds));
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position.x, change.position.y);
        } else if (change.type === 'remove') {
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
        deleteKeyCode="Delete"
        className="w-full h-full"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color={theme === 'dark' ? '#334155' : '#cbd5e1'}
          gap={16}
        />
        <Controls className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md font-sans" />
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
