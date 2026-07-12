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
import { Trash2, X, Info, Save, Clock, Settings } from 'lucide-react';

const nodeTypes = { customNode: BaseNode };
const edgeTypes = { customEdge: AnimatedEdge };

// ─────────────────────────────────────────────────────────────────────────────
// Drag Ghost — floating preview that follows the cursor during drag
// ─────────────────────────────────────────────────────────────────────────────
const DragGhost: React.FC = () => {
  const { pendingDrop } = useAppStore();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pendingDrop) {
      setPos(null);
      return;
    }

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [pendingDrop]);

  if (!pendingDrop || !pos) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x + 12,
        top: pos.y + 12,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-lg opacity-80 whitespace-nowrap">
        + {pendingDrop.name}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Inner component — must be inside <ReactFlowProvider>
// ─────────────────────────────────────────────────────────────────────────────
const FlowWrapper: React.FC = () => {
  const {
    logicalData,
    visualData,
    addNode,
    updateNodePosition,
    addEdge: zustandAddEdge,
    deleteNode,
    deleteEdge,
    updateCanvasViewport,
    pendingDrop,
    cancelDrag,
    selectedSequenceId,
    setSelectedSequenceId,
    addSequenceStep,
    setSequenceStepOrder,
    theme,
    clearCanvas,
    updateNodeDetails,
    updateEdgeDetails,
  } = useAppStore();

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
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
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
      };

      setRfNodes((nds) => [...nds, newNode]);
      addNode({ id: nodeId, type, name }, { id: nodeId, x, y });
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
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      
      // Calculate next step number default
      const nextStepNum = logicalData.sequences.length > 0 
        ? Math.max(...logicalData.sequences.map(s => s.stepNumber)) + 1 
        : 1;
        
      setStepOrderVal(nextStepNum);
      setPendingConnection(connection);
    },
    [logicalData.sequences]
  );

  const confirmConnection = useCallback(() => {
    if (!pendingConnection || !pendingConnection.source || !pendingConnection.target) return;
    
    const edgeId = `edge-${pendingConnection.source}-${pendingConnection.target}-${Date.now()}`;
    const newEdge: Edge = {
      id: edgeId,
      type: 'customEdge',
      source: pendingConnection.source,
      target: pendingConnection.target,
      sourceHandle: pendingConnection.sourceHandle ?? undefined,
      targetHandle: pendingConnection.targetHandle ?? undefined,
    };
    
    // 1. Add edge locally to React Flow
    setRfEdges((eds) => addEdge(newEdge, eds));
    
    // 2. Persist edge to Zustand
    zustandAddEdge({
      id: edgeId,
      from: pendingConnection.source,
      to: pendingConnection.target,
      fromPort: (pendingConnection.sourceHandle ?? 'right') as 'top' | 'right' | 'bottom' | 'left',
      toPort: (pendingConnection.targetHandle ?? 'left') as 'top' | 'right' | 'bottom' | 'left',
      isAsync: false,
    });

    // 3. Create sequence step automatically with visual timings
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
    ? (rfNodes.find(n => n.id === pendingConnection.source)?.data as any)?.name ?? pendingConnection.source
    : '';
  const connectionDstName = pendingConnection
    ? (rfNodes.find(n => n.id === pendingConnection.target)?.data as any)?.name ?? pendingConnection.target
    : '';

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
        <Controls className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md" />
      </ReactFlow>

      {/* Floating Clear Canvas Button (Bottom Right) */}
      <div className="absolute bottom-4 right-14 z-40 flex items-center">
        <button
          onClick={() => setShowClearModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 shadow-md transition-all active:scale-95 cursor-pointer"
          title={theme === 'dark' ? 'Tüm Tuvali Temizle' : 'Clear Canvas'}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{theme === 'dark' ? 'Temizle' : 'Clear All'}</span>
        </button>
      </div>

      {/* Floating Properties Panel: Düğüm (Node) */}
      {activeNodeProperties && (
        <div
          className="fixed z-[1100] w-[280px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 select-none animate-in fade-in zoom-in-95"
          style={{
            left: Math.min(activeNodeProperties.x, window.innerWidth - 300),
            top: Math.min(activeNodeProperties.y, window.innerHeight - 300),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-500" />
              {theme === 'dark' ? 'Bileşen Özellikleri' : 'Component Properties'}
            </span>
            <button 
              onClick={() => setActiveNodeProperties(null)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {/* Name Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
                {theme === 'dark' ? 'Bileşen Adı' : 'Name'}
              </label>
              <input
                type="text"
                value={activeNodeProperties.name}
                onChange={(e) => setActiveNodeProperties({ ...activeNodeProperties, name: e.target.value })}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Type Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
                {theme === 'dark' ? 'Bileşen Tipi' : 'Type'}
              </label>
              <select
                value={activeNodeProperties.type}
                onChange={(e) => setActiveNodeProperties({ ...activeNodeProperties, type: e.target.value })}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="client">{theme === 'dark' ? 'İstemci (Client)' : 'Client'}</option>
                <option value="gateway">API Gateway</option>
                <option value="server">{theme === 'dark' ? 'Uygulama Sunucusu' : 'App Server'}</option>
                <option value="database">{theme === 'dark' ? 'Veritabanı (SQL)' : 'Database'}</option>
                <option value="cache">{theme === 'dark' ? 'Önbellek (Redis)' : 'Cache Store'}</option>
                <option value="queue">{theme === 'dark' ? 'Mesaj Kuyruğu' : 'Message Queue'}</option>
              </select>
            </div>

            {/* Theme Color Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5 font-sans">
                {theme === 'dark' ? 'Tema Rengi' : 'Theme Color'}
              </label>
              <div className="flex gap-2.5">
                {['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan'].map((color) => {
                  const bgColors: Record<string, string> = {
                    indigo: 'bg-indigo-500',
                    emerald: 'bg-emerald-500',
                    rose: 'bg-rose-500',
                    amber: 'bg-amber-500',
                    violet: 'bg-violet-500',
                    cyan: 'bg-cyan-500',
                  };
                  return (
                    <button
                      key={color}
                      onClick={() => setActiveNodeProperties({ ...activeNodeProperties, theme: color })}
                      className={`w-5 h-5 rounded-full ${bgColors[color]} hover:scale-110 active:scale-90 transition-all cursor-pointer ${
                        activeNodeProperties.theme === color ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900' : ''
                      }`}
                      title={color}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => setActiveNodeProperties(null)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {theme === 'dark' ? 'Vazgeç' : 'Cancel'}
            </button>
            <button
              onClick={() => {
                updateNodeDetails(
                  activeNodeProperties.id,
                  activeNodeProperties.name,
                  activeNodeProperties.type,
                  activeNodeProperties.theme
                );
                setRfNodes((nds) =>
                  nds.map((n) =>
                    n.id === activeNodeProperties.id
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            name: activeNodeProperties.name,
                            type: activeNodeProperties.type,
                          },
                        }
                      : n
                  )
                );
                setActiveNodeProperties(null);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer transition-colors"
            >
              <Save className="w-3 h-3" />
              <span>{theme === 'dark' ? 'Uygula' : 'Apply'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Properties Panel: Bağlantı (Edge/Sequence) */}
      {activeEdgeProperties && (
        <div
          className="fixed z-[1100] w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 select-none animate-in fade-in zoom-in-95"
          style={{
            left: Math.min(activeEdgeProperties.x, window.innerWidth - 340),
            top: Math.min(activeEdgeProperties.y, window.innerHeight - 420),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-500" />
              {theme === 'dark' ? 'Bağlantı Özellikleri' : 'Connection Properties'}
            </span>
            <button 
              onClick={() => setActiveEdgeProperties(null)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
            {/* Protocol */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
                {theme === 'dark' ? 'Protokol' : 'Protocol'}
              </label>
              <input
                type="text"
                placeholder="örn: HTTP, HTTPS, gRPC, WebSocket"
                value={activeEdgeProperties.protocol}
                onChange={(e) => setActiveEdgeProperties({ ...activeEdgeProperties, protocol: e.target.value })}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Step Order & Async Flow */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
                  {theme === 'dark' ? 'İşlem Sırası' : 'Step Number'}
                </label>
                <select
                  value={activeEdgeProperties.stepNumber}
                  onChange={(e) => setActiveEdgeProperties({ ...activeEdgeProperties, stepNumber: Number(e.target.value) })}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <option key={n} value={n}>Step {n}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 justify-center">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-sans">
                  {theme === 'dark' ? 'Asenkron Akış' : 'Async Mode'}
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeEdgeProperties.isAsync}
                    onChange={(e) => setActiveEdgeProperties({ ...activeEdgeProperties, isAsync: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>
            </div>

            {/* Timings (Duration & Delay) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
                  {theme === 'dark' ? 'Süre (ms)' : 'Duration (ms)'}
                </label>
                <input
                  type="number"
                  min="50"
                  value={activeEdgeProperties.duration}
                  onChange={(e) => setActiveEdgeProperties({ ...activeEdgeProperties, duration: Math.max(50, Number(e.target.value)) })}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
                  {theme === 'dark' ? 'Gecikme (ms)' : 'Delay (ms)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={activeEdgeProperties.delay}
                  onChange={(e) => setActiveEdgeProperties({ ...activeEdgeProperties, delay: Math.max(0, Number(e.target.value)) })}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Tooltip Description Bubble */}
            <div className="flex flex-col gap-1 border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
                {theme === 'dark' ? 'Bileşen İçi İşlem (Tooltip)' : 'Internal Process Tooltip'}
              </label>
              <input
                type="text"
                placeholder="örn: Veri İşleniyor..."
                value={activeEdgeProperties.tooltipText}
                onChange={(e) => setActiveEdgeProperties({ ...activeEdgeProperties, tooltipText: e.target.value })}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 mb-1"
              />
              <input
                type="number"
                placeholder="Gösterim Süresi (ms)"
                min="100"
                value={activeEdgeProperties.tooltipDuration}
                onChange={(e) => setActiveEdgeProperties({ ...activeEdgeProperties, tooltipDuration: Math.max(100, Number(e.target.value)) })}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => setActiveEdgeProperties(null)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {theme === 'dark' ? 'Vazgeç' : 'Cancel'}
            </button>
            <button
              onClick={() => {
                updateEdgeDetails(
                  activeEdgeProperties.id,
                  activeEdgeProperties.protocol,
                  activeEdgeProperties.isAsync,
                  activeEdgeProperties.duration,
                  activeEdgeProperties.delay,
                  activeEdgeProperties.tooltipText,
                  activeEdgeProperties.tooltipDuration
                );
                
                const seq = logicalData.sequences.find((s) => s.edgeId === activeEdgeProperties.id);
                if (seq && seq.stepNumber !== activeEdgeProperties.stepNumber) {
                  setSequenceStepOrder(seq.id, activeEdgeProperties.stepNumber);
                }

                setActiveEdgeProperties(null);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer transition-colors"
            >
              <Save className="w-3 h-3" />
              <span>{theme === 'dark' ? 'Uygula' : 'Apply'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Clear Canvas Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                {theme === 'dark' ? 'Tuvali Temizle' : 'Clear Canvas'}
              </span>
              <button 
                onClick={() => setShowClearModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              {theme === 'dark' 
                ? 'Tüm bileşenler, bağlantılar ve zaman akışları kalıcı olarak silinecektir. Bu işlemi geri alamazsınız. Emin misiniz?'
                : 'All components, connections, and timeline sequences will be permanently deleted. This action cannot be undone. Are you sure?'}
            </p>

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {theme === 'dark' ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  clearCanvas();
                  setRfNodes([]);
                  setRfEdges([]);
                  setShowClearModal(false);
                }}
                className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer transition-colors"
              >
                {theme === 'dark' ? 'Her Şeyi Temizle' : 'Clear Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beautiful Glassmorphism Context Menu */}
      {menu && (
        <div
          className="fixed z-[1000] min-w-[200px] bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-2xl p-2 select-none flex flex-col gap-1 transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            left: menu.x,
            top: menu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header/Info */}
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200/40 dark:border-slate-800/40 mb-1">
            <Info className="w-3.5 h-3.5" />
            <span className="truncate max-w-[150px]">{menu.label}</span>
          </div>

          {/* Change Step Order Option (Only for Edges) */}
          {menu.type === 'edge' && (
            <>
              {logicalData.sequences
                .filter((s) => s.edgeId === menu.id)
                .map((seq, idx, arr) => (
                  <div 
                    key={seq.id} 
                    className={`px-3 py-1.5 flex items-center justify-between gap-3 ${
                      idx === arr.length - 1 ? 'border-b border-slate-200/40 dark:border-slate-800/40 mb-1' : ''
                    }`}
                  >
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {theme === 'dark' ? 'Adım Sırası:' : 'Step Order:'}
                    </span>
                    <select
                      value={seq.stepNumber}
                      onChange={(e) => {
                        setSequenceStepOrder(seq.id, Number(e.target.value));
                        closeMenu();
                      }}
                      className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-bold cursor-pointer outline-none focus:border-indigo-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <option key={n} value={n}>Step {n}</option>
                      ))}
                    </select>
                  </div>
                ))}
              
              {/* If connection has no steps, allow adding it to flow */}
              {logicalData.sequences.filter((s) => s.edgeId === menu.id).length === 0 && (
                <button
                  onClick={() => {
                    const nextStepNum = logicalData.sequences.length > 0 
                      ? Math.max(...logicalData.sequences.map(s => s.stepNumber)) + 1 
                      : 1;
                    const seqId = `seq-${Date.now()}`;
                    addSequenceStep(
                      { id: seqId, stepNumber: nextStepNum, edgeId: menu.id, isAsync: false },
                      { sequenceId: seqId, duration: 1000, delay: 0 }
                    );
                    closeMenu();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border-b border-slate-200/40 dark:border-slate-800/40 rounded-xl transition-all duration-200 w-full text-left cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>{theme === 'dark' ? 'Akışa Ekle' : 'Add to Sequence'}</span>
                </button>
              )}
            </>
          )}

          {/* Delete Action */}
          <button
            onClick={handleDeleteElement}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:bg-rose-100 dark:active:bg-rose-500/20 rounded-xl transition-all duration-200 w-full text-left"
          >
            <Trash2 className="w-4 h-4" />
            <span>{theme === 'dark' ? 'Sil' : 'Delete'}</span>
          </button>

          {/* Close Action */}
          <button
            onClick={closeMenu}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-200 w-full text-left"
          >
            <X className="w-4 h-4" />
            <span>{theme === 'dark' ? 'Kapat' : 'Cancel'}</span>
          </button>
        </div>
      )}

      {/* Step Order Popup Modal on Connection */}
      {pendingConnection && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                {theme === 'dark' ? 'Adım Sırası Belirle' : 'Set Step Order'}
              </span>
              <button 
                onClick={cancelConnection}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {theme === 'dark' ? (
                <>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{connectionSrcName}</span> bileşeninden{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-200">{connectionDstName}</span> bileşenine çizdiğiniz bağlantının çalıştırılma sırasını girin.
                </>
              ) : (
                <>
                  Enter the execution step order for the link between{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-200">{connectionSrcName}</span> and{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-200">{connectionDstName}</span>.
                </>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {theme === 'dark' ? 'Adım Numarası (Sıra)' : 'Step Number (Order)'}
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={stepOrderVal}
                onChange={(e) => setStepOrderVal(Math.max(1, Number(e.target.value)))}
                className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-600 w-full font-bold"
              />
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={cancelConnection}
                className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === 'dark' ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={confirmConnection}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{theme === 'dark' ? 'Kaydet' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Public export
// ─────────────────────────────────────────────────────────────────────────────
export const DiagramCanvas: React.FC = () => (
  <div style={{ width: '100%', height: '100%' }}>
    <ReactFlowProvider>
      <FlowWrapper />
      <DragGhost />
    </ReactFlowProvider>
  </div>
);
