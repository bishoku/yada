import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  reconnectEdge,
  useViewport,
} from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { AnimatedEdge } from './AnimatedEdge';
import { SectionNode } from './SectionNode';
import { StickyNoteNode } from './StickyNoteNode';
import { FreeFormNode } from './FreeFormNode';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';
import { Trash2 } from 'lucide-react';

import { ContextMenu } from './ContextMenu';
import { findAutoRoute } from './utils/autoRouting';
import { ClearCanvasModal } from './ClearCanvasModal';
import { DragGhost } from './DragGhost';
import { StickyNoteEditorModal } from './StickyNoteEditorModal';
import { FreehandOverlay } from './FreehandOverlay';
import { DrawingToolbar } from './DrawingToolbar';
import { MultiSelectionToolbar } from './MultiSelectionToolbar';
import { ActiveAttributesPopover } from './ActiveAttributesPopover';
import { getDefaultHandles } from '../../utils/portUtils';
import { generateEdgeId, generateSeqId } from '../../utils/idGenerator';
import { calculateViewportBounds } from '../../utils/canvasRenderer';


import {
  useCanvasSync,
  useCanvasDrop,
  useCanvasShortcuts,
  useSectionDrag,
  useSnapping,
} from './hooks';


const nodeTypes = { customNode: BaseNode, sectionNode: SectionNode, stickyNoteNode: StickyNoteNode, freeFormNode: FreeFormNode };
const edgeTypes = { customEdge: AnimatedEdge };

function isColorDark(color: string): boolean {
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  } else if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return true;
}

const FlowWrapper: React.FC = () => {
  const updateNodePosition = useAppStore((s) => s.updateNodePosition);
  const updateNodeDimensions = useAppStore((s) => s.updateNodeDimensions);
  const zustandAddEdge = useAppStore((s) => s.addEdge);
  const zustandReconnectEdge = useAppStore((s) => s.reconnectEdge);
  const deleteNode = useAppStore((s) => s.deleteNode);
  const deleteEdge = useAppStore((s) => s.deleteEdge);
  const cloneNode = useAppStore((s) => s.cloneNode);
  const updateCanvasViewport = useAppStore((s) => s.updateCanvasViewport);
  const pendingDrop = useAppStore((s) => s.pendingDrop);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);
  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const addSequenceStep = useAppStore((s) => s.addSequenceStep);
  const theme = useAppStore((s) => s.theme);
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const clearCanvas = useAppStore((s) => s.clearCanvas);
  const updateNodeDetails = useAppStore((s) => s.updateNodeDetails);
  const pushToHistory = useAppStore((s) => s.pushToHistory);
  const focusedNodeId = useAppStore((s) => s.focusedNodeId);
  const setFocusedNodeId = useAppStore((s) => s.setFocusedNodeId);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const isReadOnly = useAppStore((s) => s.isReadOnly);
  const setActiveNodeProperties = useAppStore((s) => s.setActiveNodeProperties);
  const setActiveEdgeProperties = useAppStore((s) => s.setActiveEdgeProperties);
  const clearActiveProperties = useAppStore((s) => s.clearActiveProperties);
  const openRightSidebar = useAppStore((s) => s.openRightSidebar);
  const gridVisible = useAppStore((s) => s.visualData.canvas.gridVisible !== false);
  const bgColor = useAppStore((s) => s.visualData.canvas.bgColor);
  const activeDrawingTool = useAppStore((s) => s.activeDrawingTool);
  const canvasRenderStyle = useAppStore((s) => s.visualData?.canvas?.renderStyle || 'clean');
  const isSketchy = canvasRenderStyle === 'sketchy';
  const isBgDark = bgColor ? isColorDark(bgColor) : theme === 'dark';
  const dotColor = isBgDark ? '#334155' : '#cbd5e1';

  const { screenToFlowPosition, setCenter, fitView, fitBounds } = useReactFlow();
  const { x: viewportX, y: viewportY, zoom } = useViewport();
  const wrapperRef = useRef<HTMLDivElement>(null);

  


  // ── Local React Flow state ─────────────────────────────────────────────────
  const [rfNodes, setRfNodes] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges] = useEdgesState<Edge>([]);
  const { alignmentLines, handleSnapping } = useSnapping();


  // ── Context Menu State ─────────────────────────────────────────────────────
  const [menu, setMenu] = useState<{
    id: string;
    type: 'node' | 'edge';
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // ── Pending Connection Modal State ─────────────────────────────────────────
  const dragStartRef = useRef<{ nodeId: string; handleId: string } | null>(null);
  const connectionCompletedRef = useRef(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleCancelActiveEdge = useCallback(() => {
    const current = useAppStore.getState().activeEdgeProperties;
    if (current?.isNew) {
      deleteEdge(current.id);
      setRfEdges((eds) => eds.filter((e) => e.id !== current.id));
    }
    clearActiveProperties();
  }, [deleteEdge, setRfEdges, clearActiveProperties]);

  // ── Custom Hooks ──────────────────────────────────────────────────────────
  const { visualDataRef } = useCanvasSync(setRfNodes, setRfEdges);
  useCanvasDrop(wrapperRef, screenToFlowPosition, setRfNodes);
  useCanvasShortcuts(closeMenu, handleCancelActiveEdge, rfNodes, setRfNodes, rfEdges, setRfEdges);

  const selectedNodeIds = useMemo(() => rfNodes.filter((n) => n.selected).map((n) => n.id), [rfNodes]);
  const handleClearSelection = useCallback(() => {
    setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  }, [setRfNodes]);

  const activeDiagramId = useAppStore((s) => s.activeDiagramId);
  const currentWorkspacePath = useAppStore((s) => s.currentWorkspace?.path);
  const autoLayoutVersion = useAppStore((s) => s.autoLayoutVersion);

  // Auto fitView on diagram open, load, tab switch, or explicit auto-layout
  useEffect(() => {
    if (rfNodes.length > 0) {
      const timer = setTimeout(() => {
        const { logicalData, visualData } = useAppStore.getState();
        const bounds = calculateViewportBounds(logicalData, visualData);
        if (bounds && bounds.width > 0 && bounds.height > 0) {
          fitBounds(
            { x: bounds.minX, y: bounds.minY, width: bounds.width, height: bounds.height },
            { padding: 0.1, duration: 300 }
          );
        } else {
          fitView({ padding: 0.2, duration: 300 });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [rfNodes.length === 0, activeDiagramId, currentWorkspacePath, autoLayoutVersion, fitView, fitBounds]);
  
  // Focus on node from external triggers (e.g., SidebarRight)
  useEffect(() => {
    if (focusedNodeId) {
      const vn = useAppStore.getState().visualData.layoutNodes[focusedNodeId];
      if (vn) {
        const logicalNodes = useAppStore.getState().logicalData.nodes;
        const layoutNodes = useAppStore.getState().visualData.layoutNodes;

        // Recursive helper to resolve absolute position of nested children
        const getAbsolutePos = (id: string): { x: number; y: number } => {
          const v = layoutNodes[id];
          if (!v) return { x: 0, y: 0 };
          const l = logicalNodes.find((n) => n.id === id);
          if (l?.parentId) {
            const parentPos = getAbsolutePos(l.parentId);
            return { x: v.x + parentPos.x, y: v.y + parentPos.y };
          }
          return { x: v.x, y: v.y };
        };

        const absPos = getAbsolutePos(focusedNodeId);
        const x = absPos.x + (vn.width ?? 120) / 2;
        const y = absPos.y + (vn.height ?? 80) / 2;
        setCenter(x, y, { zoom: 1.2, duration: 800 });

        setSelectedSequenceId(null);
        clearActiveProperties();
        setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })));

        setRfNodes((nds) =>
          nds.map((n) => ({
            ...n,
            selected: n.id === focusedNodeId,
          }))
        );
      }
      setFocusedNodeId(null);
    }
  }, [focusedNodeId, setCenter, setRfNodes, setFocusedNodeId, setSelectedSequenceId, setRfEdges]);

  // Clear selected states and property panels when simulation starts playing
  useEffect(() => {
    if (isPlaying) {
      setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
      setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
      clearActiveProperties();
    }
  }, [isPlaying, setRfNodes, setRfEdges, clearActiveProperties]);

  const { onNodeDragStop } = useSectionDrag();

  // ── View Interactions ─────────────────────────────────────────────────────
  const handleNodeClick = useCallback((e: React.MouseEvent, node: Node) => {
    if (isPlaying) return;
    e.stopPropagation();
    closeMenu();
    setActiveEdgeProperties(null);

    const logicalData = useAppStore.getState().logicalData;
    const ln = logicalData.nodes.find(n => n.id === node.id);
    const vn = visualDataRef.current.layoutNodes[node.id];
    
    if (ln) {
      if (ln.type === 'sticky_note') {
        clearActiveProperties();
        const ev = new CustomEvent('canvas:editStickyNote', { detail: { id: node.id } });
        window.dispatchEvent(ev);
        return;
      }
      
      setActiveNodeProperties({
        id: node.id,
        name: ln.name,
        type: ln.type,
        theme: vn?.theme ?? 'white',
        handles: vn?.handles,
        displayMode: vn?.displayMode ?? 'default',
        rotation: vn?.rotation ?? 0,
        customStyles: vn?.customStyles ?? {},
        properties: ln.properties ?? {},
      });
      setActiveEdgeProperties(null);
      openRightSidebar();
    }
  }, [closeMenu, visualDataRef, setActiveNodeProperties, setActiveEdgeProperties, openRightSidebar, clearActiveProperties, isPlaying]);

  const handleEdgeClick = useCallback((e: React.MouseEvent, edge: Edge) => {
    if (isPlaying) return;
    e.stopPropagation();
    closeMenu();
    setActiveNodeProperties(null);

    const logicalData = useAppStore.getState().logicalData;
    const visualData = useAppStore.getState().visualData;
    const le = logicalData.edges.find(e => e.id === edge.id);
    const ve = visualData.layoutEdges[edge.id];
    const seq = logicalData.sequences.find(s => s.edgeId === edge.id);
    
    if (seq) {
      setSelectedSequenceId(seq.id);
    } else {
      setSelectedSequenceId(null);
    }

    if (le) {
      const timing = seq ? visualDataRef.current.timelines[seq.id] : null;
      setActiveEdgeProperties({
        id: edge.id,
        protocol: le.protocol ?? 'Call',
        isAsync: le.isAsync,
        stepNumber: seq?.stepNumber ?? 1,
        duration: timing?.duration ?? 1000,
        delay: timing?.delay ?? 0,
        tooltipText: timing?.internalProcess?.text ?? '',
        tooltipDuration: timing?.internalProcess?.duration ?? 1000,
        description: le.description ?? '',
        particleType: ve?.particleType ?? 'dot',
        showArrow: ve?.showArrow ?? false,
        color: ve?.color ?? '',
        connectionType: ve?.connectionType,
        strokeWidth: ve?.strokeWidth,
        lineStyle: ve?.lineStyle,
        arrowStart: ve?.arrowStart,
        arrowEnd: ve?.arrowEnd,
        gradientColor: ve?.gradientColor,
        labelPosition: ve?.labelPosition,
        glowIntensity: ve?.glowIntensity,
        properties: le.properties ?? {},
      });
      setActiveNodeProperties(null);
      openRightSidebar();
    }
  }, [closeMenu, visualDataRef, setSelectedSequenceId, setActiveEdgeProperties, setActiveNodeProperties, openRightSidebar, isPlaying]);

  // ── Listen for Export Trigger ───────────────
  useEffect(() => {
    const handleExportFitView = () => {
      const { logicalData, visualData } = useAppStore.getState();
      const bounds = calculateViewportBounds(logicalData, visualData);

      if (bounds && bounds.width > 0 && bounds.height > 0) {
        fitBounds(
          { x: bounds.minX, y: bounds.minY, width: bounds.width, height: bounds.height },
          { padding: 0.05, duration: 0 }
        );
      } else {
        fitView({ padding: 0.1, duration: 0 });
      }
    };
    window.addEventListener('export:fitview', handleExportFitView);
    return () => window.removeEventListener('export:fitview', handleExportFitView);
  }, [fitView, fitBounds]);

  useEffect(() => {
    if (!selectedSequenceId) {
      setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
      return;
    }
    const logicalData = useAppStore.getState().logicalData;
    const seq = logicalData.sequences.find((s) => s.id === selectedSequenceId);
    if (!seq) return;

    const edge = logicalData.edges.find((e) => e.id === seq.edgeId);
    if (!edge) return;

    const sourceNode = visualDataRef.current.layoutNodes[edge.sourceId];
    const targetNode = visualDataRef.current.layoutNodes[edge.targetId];
    if (!sourceNode || !targetNode) return;

    const logicalNodes = logicalData.nodes;
    const layoutNodes = visualDataRef.current.layoutNodes;

    // Helper to calculate absolute node position recursively
    const getAbsolutePos = (id: string): { x: number; y: number } => {
      const v = layoutNodes[id];
      if (!v) return { x: 0, y: 0 };
      const l = logicalNodes.find((n) => n.id === id);
      if (l?.parentId) {
        const parentPos = getAbsolutePos(l.parentId);
        return { x: v.x + parentPos.x, y: v.y + parentPos.y };
      }
      return { x: v.x, y: v.y };
    };

    const sourcePos = getAbsolutePos(edge.sourceId);
    const targetPos = getAbsolutePos(edge.targetId);

    const sourceW = sourceNode.width ?? 120;
    const sourceH = sourceNode.height ?? 80;
    const targetW = targetNode.width ?? 120;
    const targetH = targetNode.height ?? 80;

    const sourceCenterX = sourcePos.x + sourceW / 2;
    const sourceCenterY = sourcePos.y + sourceH / 2;
    const targetCenterX = targetPos.x + targetW / 2;
    const targetCenterY = targetPos.y + targetH / 2;

    const centerX = (sourceCenterX + targetCenterX) / 2;
    const centerY = (sourceCenterY + targetCenterY) / 2;
    
    setCenter(centerX, centerY, { zoom: 1.3, duration: 800 });

    setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setActiveNodeProperties(null);

    setRfEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: e.id === edge.id,
      }))
    );
  }, [selectedSequenceId, setCenter, setRfEdges, setRfNodes, visualDataRef]);

  useEffect(() => {
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [closeMenu]);

  const onNodeDragStart = useCallback(() => {
    pushToHistory();
  }, [pushToHistory]);

  // ── Node changes ──────────────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (isPlaying) return;

      const hasNodeSelection = changes.some((c) => c.type === 'select' && c.selected);
      if (hasNodeSelection) {
        setSelectedSequenceId(null);
        setActiveEdgeProperties(null);
        setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
      }

      // Smart Alignment Snapping implementation
      handleSnapping(changes);

      setRfNodes((nds) => applyNodeChanges(changes, nds));
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position.x, change.position.y);
        } else if (change.type === 'dimensions' && change.dimensions) {
          updateNodeDimensions(change.id, Math.round(change.dimensions.width), Math.round(change.dimensions.height));
        } else if (change.type === 'remove') {
          const state = useAppStore.getState();
          const node = state.logicalData.nodes.find(n => n.id === change.id);
          if (node?.type === 'section') {
            return;
          }
          deleteNode(change.id);
        }
      });
    },
    [setRfNodes, updateNodePosition, updateNodeDimensions, deleteNode, isPlaying, setSelectedSequenceId, setRfEdges, handleSnapping]

  );

  // ── Edge changes ──────────────────────────────────────────────────────────
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (isPlaying) return;

      const hasEdgeSelection = changes.some((c) => c.type === 'select' && c.selected);
      if (hasEdgeSelection) {
        setActiveNodeProperties(null);
        setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
      }

      setRfEdges((eds) => applyEdgeChanges(changes, eds));
      changes.forEach((change) => {
        if (change.type === 'remove') deleteEdge(change.id);
      });
    },
    [setRfEdges, deleteEdge, isPlaying, setRfNodes]
  );

  // ── Handle Connection ──────────────────────────────────────────────────────
  const isValidConnection = useCallback((connection: Edge | Connection) => {
    if (!connection.source || !connection.target) return false;
    const state = useAppStore.getState();
    const srcNode = state.logicalData.nodes.find((n) => n.id === connection.source);
    const tgtNode = state.logicalData.nodes.find((n) => n.id === connection.target);
    if (!srcNode || !tgtNode) return false;
    if (srcNode.type === 'section' || tgtNode.type === 'section') return false;
    if (srcNode.type === 'sticky_note' || tgtNode.type === 'sticky_note') return false;
    return true;
  }, []);

  const createConnectionBetweenNodes = useCallback(
    (source: string, target: string, sourceHandle?: string, targetHandle?: string) => {
      if (isPlaying) return;
      if (!source || !target) return;

      const logicalNodes = useAppStore.getState().logicalData.nodes;
      const sourceNode = logicalNodes.find(n => n.id === source);
      const targetNode = logicalNodes.find(n => n.id === target);
      
      if (!sourceNode || !targetNode) return;
      if (sourceNode.type === 'section' || targetNode.type === 'section') {
        return; // Prevent connecting to/from sections
      }
      if (sourceNode.type === 'sticky_note' || targetNode.type === 'sticky_note') {
        return; // Prevent connecting to/from sticky notes
      }
      
      const logicalData = useAppStore.getState().logicalData;
      const nextStepNum = logicalData.sequences.length > 0 
        ? Math.max(...logicalData.sequences.map(s => s.stepNumber)) + 1 
        : 1;
        
      let logicalFrom = source;
      let logicalTo = target;
      let logicalFromPort = (sourceHandle ?? 'right:50').split('-')[0];
      let logicalToPort = (targetHandle ?? 'left:50').split('-')[0];

      if (dragStartRef.current) {
        if (dragStartRef.current.nodeId === target) {
          logicalFrom = target;
          logicalTo = source;
          logicalFromPort = (targetHandle ?? 'left:50').split('-')[0];
          logicalToPort = (sourceHandle ?? 'right:50').split('-')[0];
        }
      }

      const edgeId = generateEdgeId(logicalFrom, logicalTo);
      const newRfEdge: Edge = {
        id: edgeId,
        type: 'customEdge',
        source,
        target,
        sourceHandle: sourceHandle ?? undefined,
        targetHandle: targetHandle ?? undefined,
      };
      
      setRfEdges((eds) => addEdge(newRfEdge, eds));
      
      // Create logical edge (topology only)
      const logicalEdge = {
        id: edgeId,
        sourceId: logicalFrom,
        targetId: logicalTo,
        isAsync: false,
      };

      // Create visual edge (ports + presentation)
      const visualEdge = {
        id: edgeId,
        sourceHandle: logicalFromPort,
        targetHandle: logicalToPort,
      };

      zustandAddEdge(logicalEdge, visualEdge);

      const seqId = generateSeqId();
      addSequenceStep(
        {
          id: seqId,
          stepNumber: nextStepNum,
          edgeId: edgeId,
          isAsync: false,
        },
        {
          sequenceId: seqId,
          duration: 1000,
          delay: 0,
        }
      );

      // Open PropertiesView in the sidebar immediately for the new edge
      setActiveEdgeProperties({
        id: edgeId,
        protocol: '',
        isAsync: false,
        stepNumber: nextStepNum,
        duration: 1000,
        delay: 0,
        tooltipText: '',
        tooltipDuration: 1000,
        description: '',
        isNew: true
      });
      openRightSidebar();
    },
    [isPlaying, setRfEdges, zustandAddEdge, addSequenceStep, setActiveEdgeProperties, openRightSidebar]
  );

  const onConnectStart = useCallback(
    (_event: any, params: { nodeId: string | null; handleId: string | null }) => {
      if (isPlaying) return;
      connectionCompletedRef.current = false;
      // Dismiss open panels so they don't cover the new edge properties panel
      setActiveNodeProperties(null);
      setActiveEdgeProperties(null);
      // Signal to CSS that a connection is being dragged (reveals all handles)
      wrapperRef.current?.classList.add('react-flow--connecting');
      if (params.nodeId && params.handleId) {
        dragStartRef.current = { nodeId: params.nodeId, handleId: params.handleId };
      }
    },
    [isPlaying, setActiveNodeProperties, setActiveEdgeProperties]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (isPlaying) return;
      connectionCompletedRef.current = true;
      if (!connection.source || !connection.target) return;
      createConnectionBetweenNodes(
        connection.source,
        connection.target,
        connection.sourceHandle ?? undefined,
        connection.targetHandle ?? undefined
      );
    },
    [isPlaying, createConnectionBetweenNodes]
  );

  const onConnectEnd = useCallback((event: any) => {
    // Remove the connecting class so handles go back to their default visibility
    wrapperRef.current?.classList.remove('react-flow--connecting');

    // Smart magnetic port snapping fallback: If dropped anywhere on a node body
    if (!connectionCompletedRef.current && dragStartRef.current && event) {
      const state = useAppStore.getState();
      const srcId = dragStartRef.current.nodeId;
      const srcNode = state.logicalData.nodes.find((n) => n.id === srcId);

      if (srcNode && srcNode.type !== 'section' && srcNode.type !== 'sticky_note') {
        let targetNodeId: string | null = null;

        // Inspect elements under pointer to find the innermost valid component node, skipping section wrappers
        if (event.clientX != null && event.clientY != null) {
          const elementsUnderPointer = document.elementsFromPoint(event.clientX, event.clientY);
          for (const el of elementsUnderPointer) {
            const nodeEl = el.closest('.react-flow__node');
            if (nodeEl) {
              const id = nodeEl.getAttribute('data-id');
              if (id && id !== srcId) {
                const node = state.logicalData.nodes.find((n) => n.id === id);
                if (node && node.type !== 'section' && node.type !== 'sticky_note') {
                  targetNodeId = id;
                  break;
                }
              }
            }
          }
        }

        if (!targetNodeId) {
          const targetEl = (event.target as HTMLElement)?.closest?.('.react-flow__node');
          const fallbackId = targetEl?.getAttribute('data-id');
          if (fallbackId && fallbackId !== srcId) {
            const node = state.logicalData.nodes.find((n) => n.id === fallbackId);
            if (node && node.type !== 'section' && node.type !== 'sticky_note') {
              targetNodeId = fallbackId;
            }
          }
        }

        if (targetNodeId && targetNodeId !== srcId) {
          const tgtId = targetNodeId;
          const srcLayout = state.visualData.layoutNodes[srcId];
          const tgtLayout = state.visualData.layoutNodes[tgtId];

          // Pick optimal port on target based on relative node vector
          let targetPort = 'left:50';
          if (srcLayout && tgtLayout) {
            const dx = (tgtLayout.x + (tgtLayout.width ?? 150) / 2) - (srcLayout.x + (srcLayout.width ?? 150) / 2);
            const dy = (tgtLayout.y + (tgtLayout.height ?? 48) / 2) - (srcLayout.y + (srcLayout.height ?? 48) / 2);

            if (Math.abs(dx) > Math.abs(dy)) {
              targetPort = dx > 0 ? 'left:50' : 'right:50';
            } else {
              targetPort = dy > 0 ? 'top:50' : 'bottom:50';
            }
          }

          const sourcePort = dragStartRef.current.handleId || 'right:50';
          createConnectionBetweenNodes(srcId, tgtId, sourcePort, `${targetPort}-target`);
        }
      }
    }

    connectionCompletedRef.current = false;
    dragStartRef.current = null;
  }, [createConnectionBetweenNodes]);


  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (isPlaying) return;
      if (!newConnection.source || !newConnection.target) return;
      const state = useAppStore.getState();
      const srcNode = state.logicalData.nodes.find((n) => n.id === newConnection.source);
      const tgtNode = state.logicalData.nodes.find((n) => n.id === newConnection.target);
      if (!srcNode || !tgtNode) return;
      if (srcNode.type === 'section' || tgtNode.type === 'section') return;
      if (srcNode.type === 'sticky_note' || tgtNode.type === 'sticky_note') return;

      setRfEdges((els) => reconnectEdge(oldEdge, newConnection, els));
      const sourceHandle = (newConnection.sourceHandle ?? 'right:50').split('-')[0];
      const targetHandle = (newConnection.targetHandle ?? 'left:50').split('-')[0];
      zustandReconnectEdge(oldEdge.id, newConnection.source, newConnection.target, sourceHandle, targetHandle);
    },
    [setRfEdges, zustandReconnectEdge]
  );

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

  const handleCloneElement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menu || menu.type !== 'node') return;
    cloneNode(menu.id);
    closeMenu();
  }, [menu, cloneNode, closeMenu]);

  const handleUnparentElement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menu || menu.type !== 'node') return;
    const state = useAppStore.getState();
    const ln = state.logicalData.nodes.find((n) => n.id === menu.id);
    if (ln?.parentId) {
      pushToHistory();
      const parentVisual = state.visualData.layoutNodes[ln.parentId];
      const visual = state.visualData.layoutNodes[menu.id];
      if (parentVisual && visual) {
        const absX = visual.x + parentVisual.x;
        const absY = visual.y + parentVisual.y;
        state.updateNodePosition(menu.id, absX, absY);
      }
      state.setNodeParent(menu.id, null);
    }
    closeMenu();
  }, [menu, pushToHistory, closeMenu]);

  const handleAutoRoute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menu || menu.type !== 'edge') return;
    const state = useAppStore.getState();
    const edge = state.logicalData.edges.find((ed) => ed.id === menu.id);
    if (!edge) return;

    const sourceNode = state.visualData.layoutNodes[edge.sourceId];
    const targetNode = state.visualData.layoutNodes[edge.targetId];
    if (!sourceNode || !targetNode) return;

    // We must read handles from rfEdges since that's where ReactFlow stores current connection handles
    const rfEdge = rfEdges.find(e => e.id === menu.id);
    const sourceHandleStr = rfEdge?.sourceHandle?.split('-')[0] ?? 'right:50';
    const targetHandleStr = rfEdge?.targetHandle?.split('-')[0] ?? 'left:50';

    const parseHandle = (node: {x: number, y: number, width?: number, height?: number}, handle: string) => {
      const w = node.width ?? 150;
      const h = node.height ?? 48;
      const center = { x: node.x + w / 2, y: node.y + h / 2 };
      const [side, pct] = handle.split(':');
      const percent = pct ? parseInt(pct, 10) / 100 : 0.5;
      if (side === 'top') return { pt: { x: node.x + w * percent, y: node.y }, side };
      if (side === 'bottom') return { pt: { x: node.x + w * percent, y: node.y + h }, side };
      if (side === 'left') return { pt: { x: node.x, y: node.y + h * percent }, side };
      if (side === 'right') return { pt: { x: node.x + w, y: node.y + h * percent }, side };
      return { pt: center, side: 'center' };
    };

    const src = parseHandle(sourceNode, sourceHandleStr);
    const dst = parseHandle(targetNode, targetHandleStr);

    const getStandoff = (pt: {x: number, y: number}, side: string, dist = 24) => {
      if (side === 'top') return { x: pt.x, y: pt.y - dist };
      if (side === 'bottom') return { x: pt.x, y: pt.y + dist };
      if (side === 'left') return { x: pt.x - dist, y: pt.y };
      if (side === 'right') return { x: pt.x + dist, y: pt.y };
      return pt;
    };

    const sourceStandoff = getStandoff(src.pt, src.side);
    const targetStandoff = getStandoff(dst.pt, dst.side);

    const obstacles = Object.entries(state.visualData.layoutNodes)
      .filter(([id, _]) => id !== edge.sourceId && id !== edge.targetId)
      .map(([_, n]) => ({
        x: n.x,
        y: n.y,
        w: n.width ?? 150,
        h: n.height ?? 48,
      }));

    // Add source and target nodes themselves as obstacles for the routing *between* standoffs
    // This ensures the path doesn't cross the source/target nodes after leaving the standoff!
    obstacles.push({ x: sourceNode.x, y: sourceNode.y, w: sourceNode.width ?? 150, h: sourceNode.height ?? 48 });
    obstacles.push({ x: targetNode.x, y: targetNode.y, w: targetNode.width ?? 150, h: targetNode.height ?? 48 });

    const path = findAutoRoute(sourceStandoff, targetStandoff, obstacles);
    if (path !== null) {
      // Build final waypoints: include standoffs if they are useful
      const finalWaypoints = [sourceStandoff, ...path, targetStandoff];
      
      // We can also run a simple collinear filter here for the whole array
      const simplified = [];
      for (let i = 0; i < finalWaypoints.length; i++) {
        if (i === 0 || i === finalWaypoints.length - 1) {
          simplified.push(finalWaypoints[i]);
        } else {
          const prev = simplified[simplified.length - 1];
          const next = finalWaypoints[i + 1];
          const curr = finalWaypoints[i];
          const crossProduct = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
          if (Math.abs(crossProduct) > 0.1) {
            simplified.push(curr);
          }
        }
      }

      pushToHistory();
      state.updateEdgeWaypoints(menu.id, simplified.length > 0 ? simplified : undefined);
    } else {
      console.warn('AutoRoute: No valid path found between nodes.');
    }
    closeMenu();
  }, [menu, pushToHistory, closeMenu, rfEdges]);


  const onPaneClick = useCallback(() => {
    closeMenu();
    setSelectedSequenceId(null);
    clearActiveProperties();
  }, [closeMenu, setSelectedSequenceId, clearActiveProperties]);



  // Callback from Node properties to update local React Flow view state immediately
  const handleApplyNodeProperties = useCallback((id: string, name: string, type: string, themeColor: string, handles?: any[], displayMode?: 'default' | 'icon-only', rotation?: number, customStyles?: any, properties?: Record<string, unknown>, skipHistory?: boolean) => {
    if (!skipHistory) pushToHistory();
    
    let handlesToSave: any[] | undefined = undefined;
    
    if (handles) {
      // 1. Bake final IDs into the handles config
      const bakedHandles = handles.map(h => ({
        id: `${h.side}:${h.offset}`,
        side: h.side,
        offset: h.offset
      }));
      
      const defaultHandles = getDefaultHandles();
      const isDefault = bakedHandles.length === defaultHandles.length &&
        bakedHandles.every((h, i) => h.id === defaultHandles[i]?.id && h.offset === defaultHandles[i]?.offset && h.side === defaultHandles[i]?.side);
      
      handlesToSave = isDefault ? undefined : bakedHandles;

      // 2. Create map from originalId/old ID to new ID
      const idMap = new Map<string, string>();
      handles.forEach(h => {
        const original = h.originalId || h.id;
        const finalId = `${h.side}:${h.offset}`;
        idMap.set(original, finalId);
      });

      // 3. Find edges to remove (connected to deleted handles)
      const { logicalData } = useAppStore.getState();
      const { visualData } = useAppStore.getState();
      const edgesToRemove = logicalData.edges.filter(e => {
        const ve = visualData.layoutEdges[e.id];
        const fromPortId = ve?.sourceHandle;
        const toPortId = ve?.targetHandle;
        if (e.sourceId === id && fromPortId && !idMap.has(fromPortId)) return true;
        if (e.targetId === id && toPortId && !idMap.has(toPortId)) return true;
        return false;
      });

      // Remove deleted edges
      edgesToRemove.forEach(e => {
        deleteEdge(e.id);
      });
      const removedIds = new Set(edgesToRemove.map(e => e.id));
      setRfEdges(eds => eds.filter(re => !removedIds.has(re.id)));

      // 4. Update ports of remaining edges in the visual layer (handles live in VisualEdge)
      const currentVisualEdges = { ...useAppStore.getState().visualData.layoutEdges };
      const remainingEdgeIds = useAppStore.getState().logicalData.edges.map(e => e.id);
      let visualEdgesChanged = false;

      remainingEdgeIds.forEach(eid => {
        const ve = currentVisualEdges[eid];
        if (!ve) return;
        const le = useAppStore.getState().logicalData.edges.find(e => e.id === eid);
        if (!le) return;

        let sourceHandle = ve.sourceHandle;
        let targetHandle = ve.targetHandle;
        let changed = false;

        if (le.sourceId === id && sourceHandle && idMap.has(sourceHandle)) {
          const newHandle = idMap.get(sourceHandle)!;
          if (sourceHandle !== newHandle) { sourceHandle = newHandle; changed = true; }
        }
        if (le.targetId === id && targetHandle && idMap.has(targetHandle)) {
          const newHandle = idMap.get(targetHandle)!;
          if (targetHandle !== newHandle) { targetHandle = newHandle; changed = true; }
        }
        if (changed) {
          currentVisualEdges[eid] = { ...ve, sourceHandle, targetHandle };
          visualEdgesChanged = true;
        }
      });

      if (visualEdgesChanged) {
        useAppStore.setState(state => ({
          visualData: { ...state.visualData, layoutEdges: currentVisualEdges }
        }));
      }

      // Update React Flow visual edges immediately to prevent flash
      setRfEdges(eds => eds.map(re => {
        let sourceHandle = re.sourceHandle;
        let targetHandle = re.targetHandle;
        let changed = false;

        if (re.source === id && re.sourceHandle) {
          const originalPort = re.sourceHandle.split('-')[0];
          if (idMap.has(originalPort)) {
            sourceHandle = `${idMap.get(originalPort)}-source`;
            changed = true;
          }
        }
        if (re.target === id && re.targetHandle) {
          const originalPort = re.targetHandle.split('-')[0];
          if (idMap.has(originalPort)) {
            targetHandle = `${idMap.get(originalPort)}-target`;
            changed = true;
          }
        }
        return changed ? { ...re, sourceHandle, targetHandle } : re;
      }));
    }
    
    updateNodeDetails(id, name, type, themeColor, handlesToSave, displayMode, rotation, customStyles, properties);
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
    clearActiveProperties();
  }, [updateNodeDetails, setRfNodes, setRfEdges, deleteEdge, pushToHistory, clearActiveProperties]);

  // ── Listen for node property apply from RightSidebarShell ───────────────
  // RightSidebarShell dispatches this event because handleApplyNodeProperties
  // needs access to React Flow local state (setRfNodes, setRfEdges) which is
  // only available inside this FlowWrapper component.
  useEffect(() => {
    const handleApplyFromSidebar = (e: Event) => {
      const { id, name, type, theme, handles, displayMode, rotation, customStyles, properties, skipHistory } = (e as CustomEvent).detail;
      handleApplyNodeProperties(id, name, type, theme, handles, displayMode, rotation, customStyles, properties, skipHistory);
    };
    window.addEventListener('canvas:applyNodeProperties', handleApplyFromSidebar);
    return () => window.removeEventListener('canvas:applyNodeProperties', handleApplyFromSidebar);
  }, [handleApplyNodeProperties]);

  return (
    <div
      ref={wrapperRef}
      className={`w-full h-full relative ${isSketchy ? 'sketchy-canvas' : ''}`}
      style={{
        cursor: pendingDrop ? 'crosshair' : undefined,
      }}
    >


      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodesDraggable={!isPlaying && !isReadOnly && !activeDrawingTool}
        nodesConnectable={!isPlaying && !isReadOnly && !activeDrawingTool}
        elementsSelectable={!isReadOnly && !activeDrawingTool}
        nodesFocusable={!isReadOnly}
        edgesFocusable={!isReadOnly}
        minZoom={0.05}
        maxZoom={3}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        panOnDrag={!activeDrawingTool}
        isValidConnection={isValidConnection}
        elevateEdgesOnSelect={true}
        onNodesChange={isReadOnly ? undefined : onNodesChange}
        onEdgesChange={isReadOnly ? undefined : onEdgesChange}
        onConnect={isReadOnly ? undefined : onConnect}
        onConnectStart={isReadOnly ? undefined : onConnectStart}
        onConnectEnd={isReadOnly ? undefined : onConnectEnd}
        onReconnect={isReadOnly ? undefined : onReconnect}
        onMoveEnd={onMoveEnd}
        onNodeContextMenu={isReadOnly ? undefined : onNodeContextMenu}
        onEdgeContextMenu={isReadOnly ? undefined : onEdgeContextMenu}
        onEdgeClick={handleEdgeClick}
        onPaneClick={onPaneClick}
        onMoveStart={() => {
          closeMenu();
        }}
        onNodeClick={handleNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        className={`w-full h-full ${isSketchy ? 'sketchy-canvas' : ''}`}
        style={{ backgroundColor: bgColor || undefined }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        {gridVisible && (
          <Background
            color={dotColor}
            gap={16}
          />
        )}
        <Controls className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md font-sans" />

        {/* Freehand / Annotation Drawing Overlay inside ReactFlow so it gets exported */}
        <FreehandOverlay />
      </ReactFlow>

      {/* Floating Drawing Toolbar */}
      <DrawingToolbar />

      {/* Floating Multi-Selection Alignment & Distribution Toolbar */}
      {!isReadOnly && !isPlaying && (
        <MultiSelectionToolbar
          selectedNodeIds={selectedNodeIds}
          onClearSelection={handleClearSelection}
        />
      )}

      {/* Floating Active Step Attributes Popover */}
      <ActiveAttributesPopover />

      {/* Drag Ghost — shows drop position preview while dragging from sidebar */}
      <DragGhost canvasRef={wrapperRef} />

      {/* Alignment Guides Overlay */}
      {alignmentLines.length > 0 && (
        <svg 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
          className="animate-in fade-in duration-150"
        >
          {alignmentLines.map((line, idx) => {
            const isVert = line.type === 'vertical';
            const x1 = (isVert ? line.pos : line.start) * zoom + viewportX;
            const y1 = (isVert ? line.start : line.pos) * zoom + viewportY;
            const x2 = (isVert ? line.pos : line.end) * zoom + viewportX;
            const y2 = (isVert ? line.end : line.pos) * zoom + viewportY;

            return (
              <g key={idx}>
                <line 
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#6366f1" // indigo-500
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.8}
                />
                {line.label && line.labelX !== undefined && line.labelY !== undefined && (
                  <g transform={`translate(${line.labelX * zoom + viewportX}, ${line.labelY * zoom + viewportY})`}>
                    <rect 
                      x={-24} y={-10} width={48} height={20} rx={4} 
                      fill="#6366f1" 
                    />
                    <text 
                      x={0} y={4} 
                      fill="white" 
                      fontSize={10} 
                      fontWeight="bold" 
                      textAnchor="middle"
                      fontFamily="sans-serif"
                    >
                      {line.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Floating Clear Canvas Button (Bottom Right) */}
      {!isReadOnly && (
        <div className="absolute bottom-4 right-14 z-40 flex items-center export-exclude">
          <button
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 shadow-md transition-all active:scale-95 cursor-pointer font-sans"
            title={t.clearCanvasTooltip}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.clearBtn}</span>
          </button>
        </div>
      )}

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
        onClone={handleCloneElement}
        onUnparent={handleUnparentElement}
        onAutoRoute={handleAutoRoute}
      />

      {/* Sticky Note Editor Modal */}
      <StickyNoteEditorModal />
    </div>

  );
};

export const DiagramCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <FlowWrapper />
    </ReactFlowProvider>
  );
};
