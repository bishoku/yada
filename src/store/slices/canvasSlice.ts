import { StateCreator } from 'zustand';
import { 
  AppState, 
  LogicalNode, 
  VisualNode, 
  LogicalEdge, 
  VisualEdge, 
  HandleConfig, 
  ActiveNodeProperties, 
  ActiveEdgeProperties, 
  StickyNote,
  CanvasRenderStyle,
  DrawingToolType,
  FreehandStroke,
  FreeFormContent
} from '../../types';
import { ParticleType } from '../../config/particles';
import { getLayoutedElements } from '../../utils/layout';
import { generateNodeId } from '../../utils/idGenerator';


export interface CanvasSlice {
  pendingDrop: { type: string; name: string } | null;
  activeNodeProperties: ActiveNodeProperties | null;
  activeEdgeProperties: ActiveEdgeProperties | null;
  addNode: (logical: LogicalNode, visual: VisualNode) => void;
  cloneNode: (id: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeDimensions: (id: string, width: number, height: number) => void;
  addStickyNote: (visual: VisualNode, annotation: StickyNote) => void;
  updateStickyNote: (id: string, updates: Partial<StickyNote>) => void;
  deleteStickyNote: (id: string) => void;
  addEdge: (logical: LogicalEdge, visual: VisualEdge) => void;
  reconnectEdge: (edgeId: string, sourceId: string, targetId: string, sourceHandle: string, targetHandle: string) => void;
  updateEdgeWaypoints: (edgeId: string, waypoints: Array<{x: number, y: number}> | undefined) => void;
  swapEdgeDirection: (edgeId: string) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateCanvasViewport: (zoom: number, pan: { x: number; y: number }) => void;
  setGridVisible: (visible: boolean) => void;
  setCanvasBgColor: (color: string | null) => void;
  setCanvasRenderStyle: (style: CanvasRenderStyle) => void;
  
  // Freehand / Annotation Drawing
  activeDrawingTool: DrawingToolType | null;
  drawingColor: string;
  drawingSize: number;
  drawingOpacity: number;
  setActiveDrawingTool: (tool: DrawingToolType | null) => void;
  setDrawingColor: (color: string) => void;
  setDrawingSize: (size: number) => void;
  setDrawingOpacity: (opacity: number) => void;
  addFreehandStroke: (stroke: FreehandStroke) => void;
  updateFreehandStroke: (id: string, updates: Partial<FreehandStroke>) => void;
  deleteFreehandStroke: (id: string) => void;
  clearFreehandStrokes: () => void;

  // FreeForm Canvas Node
  updateFreeformContent: (nodeId: string, content: FreeFormContent | null) => void;

  startDrag: (type: string, name: string) => void;
  cancelDrag: () => void;
  clearCanvas: () => void;
  updateNodeDetails: (id: string, name: string, type: string, theme?: string, handles?: HandleConfig[], displayMode?: 'default' | 'icon-only', rotation?: number, customStyles?: any, properties?: Record<string, unknown>) => void;
  updateNodeHandles: (nodeId: string, handles: HandleConfig[]) => void;
  updateEdgeDetails: (
    edgeId: string,
    protocol: string,
    isAsync: boolean,
    description?: string,
    duration?: number,
    delay?: number,
    tooltipText?: string,
    tooltipDuration?: number,
    particleType?: ParticleType,
    showArrow?: boolean,
    color?: string,
    properties?: Record<string, unknown>,
    connectionType?: import('../../types').EdgeConnectionType,
    strokeWidth?: number,
    lineStyle?: import('../../types').EdgeLineStyle,
    arrowStart?: import('../../types').EdgeArrowType,
    arrowEnd?: import('../../types').EdgeArrowType,
    gradientColor?: string,
    labelPosition?: number,
    glowIntensity?: import('../../types').EdgeGlowIntensity
  ) => void;
  setNodeParent: (nodeId: string, parentId: string | null) => void;
  autoResizeSection: (sectionId: string) => void;
  deleteSectionWithChoice: (sectionId: string, deleteChildren: boolean) => void;
  alignSelectedNodes: (nodeIds: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelectedNodes: (nodeIds: string[], direction: 'horizontal' | 'vertical') => void;
  packNodesIntoSection: (nodeIds: string[], title?: string) => void;
  deleteSelectedNodes: (nodeIds: string[]) => void;
  applyAutoLayout: (direction: 'TB' | 'LR') => void;
  focusedNodeId: string | null;
  setFocusedNodeId: (id: string | null) => void;
  setActiveNodeProperties: (props: ActiveNodeProperties | null) => void;
  setActiveEdgeProperties: (props: ActiveEdgeProperties | null) => void;
  clearActiveProperties: () => void;
  updateDiagramFromAi: (logical: import('../../types').LogicalDiagram, visual: import('../../types').VisualDiagram) => void;
}


export const createCanvasSlice: StateCreator<AppState, [], [], CanvasSlice> = (set, get) => ({
  pendingDrop: null,
  activeNodeProperties: null,
  activeEdgeProperties: null,
  focusedNodeId: null,
  setFocusedNodeId: (id) => set({ focusedNodeId: id }),
  setActiveNodeProperties: (props) => set({ activeNodeProperties: props }),
  setActiveEdgeProperties: (props) => set({ activeEdgeProperties: props }),
  clearActiveProperties: () => set({ activeNodeProperties: null, activeEdgeProperties: null }),

  updateDiagramFromAi: (logical, visual) => {
    get().pushToHistory();
    set((state) => ({
      logicalData: logical || state.logicalData,
      visualData: visual || state.visualData,
      isDirty: true,
    }));
  },

  addNode: (logical, visual) => {

    get().pushToHistory();
    set((state) => {
      const nodes = [...state.logicalData.nodes, logical];
      // Handles are now in VisualNode; logical node is lean
      const layoutNodes = { ...state.visualData.layoutNodes, [visual.id]: visual };
      return {
        logicalData: { ...state.logicalData, nodes },
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  cloneNode: (id) => {
    get().pushToHistory();
    set((state) => {
      const originalLogicalNode = state.logicalData.nodes.find((n) => n.id === id);
      const originalVisualNode = state.visualData.layoutNodes[id];
      const originalAnnotation = state.visualData.annotations?.[id];

      if (!originalVisualNode) return {};

      if (!originalLogicalNode && originalAnnotation) {
        const cloneId = generateNodeId('sticky_note');
        const clonedVisualNode: VisualNode = {
          ...originalVisualNode,
          id: cloneId,
          x: originalVisualNode.x + 30,
          y: originalVisualNode.y + 30,
        };
        const clonedAnnotation = {
          ...originalAnnotation,
          id: cloneId,
          header: `${originalAnnotation.header || 'Note'} (Copy)`,
        };
        const layoutNodes = { ...state.visualData.layoutNodes, [cloneId]: clonedVisualNode };
        const annotations = { ...state.visualData.annotations, [cloneId]: clonedAnnotation };
        return {
          visualData: { ...state.visualData, layoutNodes, annotations },
          isDirty: true,
        };
      }

      if (!originalLogicalNode) return {};

      const cloneId = generateNodeId(originalLogicalNode.type);
      
      const baseClonedName = `${originalLogicalNode.name} (Copy)`;
      let clonedName = baseClonedName;
      const existingNames = state.logicalData.nodes.map((n) => n.name);
      if (existingNames.includes(clonedName)) {
        let index = 1;
        clonedName = `${baseClonedName} ${index}`;
        while (existingNames.includes(clonedName)) {
          index++;
          clonedName = `${baseClonedName} ${index}`;
        }
      }

      const clonedLogicalNode: LogicalNode = {
        ...originalLogicalNode,
        id: cloneId,
        name: clonedName,
      };

      const clonedVisualNode: VisualNode = {
        ...originalVisualNode,
        id: cloneId,
        x: originalVisualNode.x + 40,
        y: originalVisualNode.y + 40,
        handles: originalVisualNode.handles ? JSON.parse(JSON.stringify(originalVisualNode.handles)) : undefined,
      };

      const nodes = [...state.logicalData.nodes, clonedLogicalNode];
      const layoutNodes = { ...state.visualData.layoutNodes, [cloneId]: clonedVisualNode };

      return {
        logicalData: { ...state.logicalData, nodes },
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  updateNodePosition: (id, x, y) => {
    set((state) => {
      const layoutNode = state.visualData.layoutNodes[id];
      if (!layoutNode) return {};
      const updatedNode = { ...layoutNode, x, y };
      const layoutNodes = { ...state.visualData.layoutNodes, [id]: updatedNode };
      return {
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  updateNodeDimensions: (id, width, height) => {
    set((state) => {
      const layoutNode = state.visualData.layoutNodes[id];
      if (!layoutNode) return {};
      const updatedNode = { ...layoutNode, width, height };
      const layoutNodes = { ...state.visualData.layoutNodes, [id]: updatedNode };
      return {
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  addStickyNote: (visual, annotation) => {
    get().pushToHistory();
    set((state) => {
      const layoutNodes = { ...state.visualData.layoutNodes, [visual.id]: visual };
      const annotations = { ...(state.visualData.annotations || {}), [annotation.id]: annotation };
      return {
        visualData: { ...state.visualData, layoutNodes, annotations },
        isDirty: true
      };
    });
  },

  updateStickyNote: (id, updates) => {
    get().pushToHistory();
    set((state) => {
      const existing = state.visualData.annotations?.[id];
      if (!existing) return {};
      const annotations = {
        ...state.visualData.annotations,
        [id]: { ...existing, ...updates }
      };
      return {
        visualData: { ...state.visualData, annotations },
        isDirty: true
      };
    });
  },

  deleteStickyNote: (id) => {
    get().pushToHistory();
    set((state) => {
      const layoutNodes = { ...state.visualData.layoutNodes };
      delete layoutNodes[id];
      
      const annotations = { ...state.visualData.annotations };
      delete annotations[id];

      return {
        visualData: { ...state.visualData, layoutNodes, annotations },
        isDirty: true
      };
    });
  },

  addEdge: (logical, visual) => {
    set((state) => {
      const edges = [...state.logicalData.edges, logical];
      const layoutEdges = { ...state.visualData.layoutEdges, [visual.id]: visual };
      return {
        logicalData: { ...state.logicalData, edges },
        visualData: { ...state.visualData, layoutEdges },
        isDirty: true
      };
    });
  },

  swapEdgeDirection: (edgeId) => {
    get().pushToHistory();
    set((state) => {
      const edges = state.logicalData.edges.map((e) => {
        if (e.id !== edgeId) return e;
        return { ...e, sourceId: e.targetId, targetId: e.sourceId };
      });

      // Also swap the visual handles
      const existingVisualEdge = state.visualData.layoutEdges[edgeId];
      const layoutEdges = existingVisualEdge
        ? {
            ...state.visualData.layoutEdges,
            [edgeId]: {
              ...existingVisualEdge,
              sourceHandle: existingVisualEdge.targetHandle,
              targetHandle: existingVisualEdge.sourceHandle,
            },
          }
        : state.visualData.layoutEdges;

      return {
        logicalData: { ...state.logicalData, edges },
        visualData: { ...state.visualData, layoutEdges },
        isDirty: true
      };
    });
  },

  deleteNode: (id) => {
    get().pushToHistory();
    set((state) => {
      const deletedNode = state.logicalData.nodes.find((n) => n.id === id);
      const isSection = deletedNode?.type === 'section';
      const sectionVisual = state.visualData.layoutNodes[id];

      // Filter out deleted node, and also clean up parentId for any children
      const nodes = state.logicalData.nodes
        .filter((n) => n.id !== id)
        .map((n) => (n.parentId === id ? { ...n, parentId: deletedNode?.parentId } : n));

      const deletedEdgeIds = state.logicalData.edges
        .filter((e) => e.sourceId === id || e.targetId === id)
        .map((e) => e.id);
      
      const edges = state.logicalData.edges.filter((e) => e.sourceId !== id && e.targetId !== id);
      const sequences = state.logicalData.sequences.filter((s) => !deletedEdgeIds.includes(s.edgeId));
      
      const layoutNodes = { ...state.visualData.layoutNodes };
      delete layoutNodes[id];

      // If it was a section, promote children to absolute coordinates
      if (isSection && sectionVisual) {
        state.logicalData.nodes.forEach((n) => {
          if (n.parentId === id) {
            const childVisual = layoutNodes[n.id];
            if (childVisual) {
              layoutNodes[n.id] = {
                ...childVisual,
                x: sectionVisual.x + childVisual.x,
                y: sectionVisual.y + childVisual.y,
              };
            }
          }
        });
      }

      // Clean up visual edges for deleted logical edges
      const layoutEdges = { ...state.visualData.layoutEdges };
      deletedEdgeIds.forEach((eid) => delete layoutEdges[eid]);
      
      const timelines = { ...state.visualData.timelines };
      state.logicalData.sequences.forEach((s) => {
        if (deletedEdgeIds.includes(s.edgeId)) {
          delete timelines[s.id];
        }
      });

      // Clean up annotations if the deleted node was a sticky note
      const annotations = { ...state.visualData.annotations };
      if (annotations[id]) {
        delete annotations[id];
      }

      return {
        logicalData: { nodes, edges, sequences, schemaVersion: state.logicalData.schemaVersion },
        visualData: { ...state.visualData, layoutNodes, layoutEdges, timelines, annotations },
        isDirty: true
      };
    });
  },

  updateEdgeWaypoints: (edgeId, waypoints) => {
    set((state) => {
      const layoutEdge = state.visualData.layoutEdges[edgeId];
      if (!layoutEdge) return {};
      const updatedEdge = { ...layoutEdge, waypoints };
      const layoutEdges = { ...state.visualData.layoutEdges, [edgeId]: updatedEdge };
      return {
        visualData: { ...state.visualData, layoutEdges },
        isDirty: true
      };
    });
  },

  reconnectEdge: (edgeId, sourceId, targetId, sourceHandle, targetHandle) => {
    const state = get();
    const sourceNode = state.logicalData.nodes.find((n) => n.id === sourceId);
    const targetNode = state.logicalData.nodes.find((n) => n.id === targetId);
    if (!sourceNode || !targetNode) return;
    if (sourceNode.type === 'section' || targetNode.type === 'section') return;
    if (sourceNode.type === 'sticky_note' || targetNode.type === 'sticky_note') return;

    get().pushToHistory();
    const edges = state.logicalData.edges.map((e) => {
      if (e.id === edgeId) {
        return { ...e, sourceId, targetId };
      }
      return e;
    });

    // Update handles in visual layer
    const existingVisualEdge = state.visualData.layoutEdges[edgeId] ?? { id: edgeId };
    const layoutEdges = {
      ...state.visualData.layoutEdges,
      [edgeId]: { ...existingVisualEdge, sourceHandle, targetHandle }
    };

    set({
      logicalData: { ...state.logicalData, edges },
      visualData: { ...state.visualData, layoutEdges },
      isDirty: true,
    });
  },

  deleteEdge: (id) => {
    get().pushToHistory();
    set((state) => {
      const edges = state.logicalData.edges.filter((e) => e.id !== id);
      const deletedSeqIds = state.logicalData.sequences
        .filter((s) => s.edgeId === id)
        .map((s) => s.id);
      
      const sequences = state.logicalData.sequences.filter((s) => s.edgeId !== id);
      
      // Clean up visual edge
      const layoutEdges = { ...state.visualData.layoutEdges };
      delete layoutEdges[id];

      const timelines = { ...state.visualData.timelines };
      deletedSeqIds.forEach((seqId) => {
        delete timelines[seqId];
      });

      return {
        logicalData: { ...state.logicalData, edges, sequences },
        visualData: { ...state.visualData, layoutEdges, timelines },
        isDirty: true
      };
    });
  },

  updateCanvasViewport: (zoom, pan) => {
    set((state) => {
      return {
        visualData: {
          ...state.visualData,
          canvas: {
            ...state.visualData.canvas,
            zoom,
            pan
          }
        },
        isDirty: true
      };
    });
  },

  setGridVisible: (visible) => {
    set((state) => ({
      visualData: {
        ...state.visualData,
        canvas: {
          ...state.visualData.canvas,
          gridVisible: visible
        }
      },
      isDirty: true
    }));
  },

  setCanvasBgColor: (color) => {
    set((state) => ({
      visualData: {
        ...state.visualData,
        canvas: {
          ...state.visualData.canvas,
          bgColor: color ?? undefined
        }
      },
      isDirty: true
    }));
  },

  setCanvasRenderStyle: (style) => {
    get().pushToHistory();
    set((state) => ({
      visualData: {
        ...state.visualData,
        canvas: {
          ...state.visualData.canvas,
          renderStyle: style,
        },
      },
      isDirty: true,
    }));
  },

  activeDrawingTool: null,
  drawingColor: '#6366f1',
  drawingSize: 3,
  drawingOpacity: 1,

  setActiveDrawingTool: (tool) => set({ activeDrawingTool: tool }),
  setDrawingColor: (color) => set({ drawingColor: color }),
  setDrawingSize: (size) => set({ drawingSize: size }),
  setDrawingOpacity: (opacity) => set({ drawingOpacity: opacity }),

  addFreehandStroke: (stroke) => {
    get().pushToHistory();
    set((state) => {
      const freehandStrokes = {
        ...(state.visualData.freehandStrokes || {}),
        [stroke.id]: stroke,
      };
      return {
        visualData: {
          ...state.visualData,
          freehandStrokes,
        },
        isDirty: true,
      };
    });
  },

  updateFreehandStroke: (id, updates) => {
    get().pushToHistory();
    set((state) => {
      const existing = state.visualData.freehandStrokes?.[id];
      if (!existing) return {};
      const freehandStrokes = {
        ...state.visualData.freehandStrokes,
        [id]: { ...existing, ...updates },
      };
      return {
        visualData: {
          ...state.visualData,
          freehandStrokes,
        },
        isDirty: true,
      };
    });
  },

  deleteFreehandStroke: (id) => {
    get().pushToHistory();
    set((state) => {
      const freehandStrokes = { ...(state.visualData.freehandStrokes || {}) };
      delete freehandStrokes[id];
      return {
        visualData: {
          ...state.visualData,
          freehandStrokes,
        },
        isDirty: true,
      };
    });
  },

  clearFreehandStrokes: () => {
    get().pushToHistory();
    set((state) => ({
      visualData: {
        ...state.visualData,
        freehandStrokes: {},
      },
      isDirty: true,
    }));
  },

  // FreeForm Canvas Node
  updateFreeformContent: (nodeId, content) => {
    get().pushToHistory();
    set((state) => {
      const existing = state.visualData.layoutNodes[nodeId];
      if (!existing) return {};
      return {
        visualData: {
          ...state.visualData,
          layoutNodes: {
            ...state.visualData.layoutNodes,
            [nodeId]: {
              ...existing,
              freeformContent: content ?? undefined,
            },
          },
        },
        isDirty: true,
      };
    });
  },

  startDrag: (type, name) => set({ pendingDrop: { type, name } }),
  cancelDrag: () => set({ pendingDrop: null }),

  clearCanvas: () => set((state) => ({
    logicalData: { schemaVersion: state.logicalData.schemaVersion, nodes: [], edges: [], sequences: [] },
    visualData: { 
      canvas: state.visualData.canvas, 
      layoutNodes: {}, 
      layoutEdges: {},
      timelines: {} 
    },
    isDirty: true,
    isPlaying: false,
    currentTime: 0,
    activeSequenceIds: [],
    selectedSequenceId: null
  })),

  updateNodeDetails: (id, name, type, theme, handles, displayMode, rotation, customStyles, properties) => {
    set((state) => {
      // Logical: name, type, properties (handles now live in visual layer)
      const nodes = state.logicalData.nodes.map((n) => 
        n.id === id ? { ...n, name, type, properties: properties !== undefined ? properties : n.properties } : n
      );
      const existingVisual = state.visualData.layoutNodes[id] ?? { id, x: 0, y: 0 };

      // When orientation changes (horizontal=0 ↔ vertical=90) swap stored
      // width and height so the bounding box instantly matches the new layout.
      const prevRotation = existingVisual.rotation ?? 0;
      const nextRotation = rotation ?? 0;
      const orientationChanged =
        (prevRotation === 0 && nextRotation === 90) ||
        (prevRotation === 90 && nextRotation === 0);

      const prevW = existingVisual.width  ?? 224;
      const prevH = existingVisual.height ?? 52;

      const layoutNodes = {
        ...state.visualData.layoutNodes,
        [id]: {
          ...existingVisual,
          theme,
          displayMode,
          rotation: nextRotation,
          customStyles,
          // Handles now stored in VisualNode
          ...(handles !== undefined ? { handles } : {}),
          ...(orientationChanged ? { width: prevH, height: prevW } : {}),
        }
      };
      return {
        logicalData: { ...state.logicalData, nodes },
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },


  updateNodeHandles: (nodeId, handles) => {
    get().pushToHistory();
    set((state) => {
      // Handles are now in VisualNode — update visual layer only
      const existingVisual = state.visualData.layoutNodes[nodeId] ?? { id: nodeId, x: 0, y: 0 };
      const layoutNodes = {
        ...state.visualData.layoutNodes,
        [nodeId]: { ...existingVisual, handles }
      };
      return {
        visualData: { ...state.visualData, layoutNodes },
        isDirty: true
      };
    });
  },

  updateEdgeDetails: (
    id: string,
    protocol: string,
    isAsync: boolean,
    description?: string,
    duration?: number,
    delay?: number,
    tooltipText?: string,
    tooltipDuration?: number,
    particleType?: ParticleType,
    showArrow?: boolean,
    color?: string,
    properties?: Record<string, unknown>,
    connectionType?: import('../../types').EdgeConnectionType,
    strokeWidth?: number,
    lineStyle?: import('../../types').EdgeLineStyle,
    arrowStart?: import('../../types').EdgeArrowType,
    arrowEnd?: import('../../types').EdgeArrowType,
    gradientColor?: string,
    labelPosition?: number,
    glowIntensity?: import('../../types').EdgeGlowIntensity
  ) => {
    set((state) => {
      // Update logical layer: protocol, isAsync, description, properties
      const edges = state.logicalData.edges.map((e) =>
        e.id === id ? { ...e, protocol, isAsync, description, properties: properties !== undefined ? properties : e.properties } : e
      );

      // Sync isAsync to sequences
      const sequences = state.logicalData.sequences.map((s) => 
        s.edgeId === id ? { ...s, isAsync } : s
      );

      // Update visual edge layer: particleType, showArrow, color + new styling properties
      const existingVisualEdge = state.visualData.layoutEdges[id] ?? { id };
      const layoutEdges = {
        ...state.visualData.layoutEdges,
        [id]: {
          ...existingVisualEdge,
          particleType,
          showArrow,
          color,
          connectionType,
          strokeWidth,
          lineStyle,
          arrowStart,
          arrowEnd,
          gradientColor,
          labelPosition,
          glowIntensity,
        }
      };

      // Update timeline layer: duration, delay, tooltip
      const seqs = state.logicalData.sequences.filter((s) => s.edgeId === id);
      const timelines = { ...state.visualData.timelines };
      seqs.forEach((seq) => {
        const existing = timelines[seq.id] || { duration: 1000, delay: 0 };
        timelines[seq.id] = {
          ...existing,
          duration: duration ?? existing.duration,
          delay: delay ?? existing.delay,
          internalProcess: tooltipText ? { text: tooltipText, duration: tooltipDuration || 1000 } : undefined
        };
      });

      return {
        logicalData: { ...state.logicalData, edges, sequences },
        visualData: { ...state.visualData, layoutEdges, timelines },
        isDirty: true
      };
    });
  },

  setNodeParent: (nodeId, parentId) => {
    get().pushToHistory();
    set((state) => {
      const nodes = state.logicalData.nodes.map((n) =>
        n.id === nodeId ? { ...n, parentId: parentId ?? undefined } : n
      );
      return {
        logicalData: { ...state.logicalData, nodes },
        isDirty: true
      };
    });
  },

  autoResizeSection: (sectionId) => {
    const state = get();
    const children = state.logicalData.nodes.filter(n => n.parentId === sectionId);
    if (children.length === 0) return;

    const sectionVisual = state.visualData.layoutNodes[sectionId];
    if (!sectionVisual) return;

    const PADDING = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    children.forEach(child => {
      const cv = state.visualData.layoutNodes[child.id];
      if (!cv) return;
      const isChildSection = child.type === 'section';
      const cw = cv.width ?? (isChildSection ? 400 : 224);
      const ch = cv.height ?? (isChildSection ? 300 : 52);
      minX = Math.min(minX, cv.x);
      minY = Math.min(minY, cv.y);
      maxX = Math.max(maxX, cv.x + cw);
      maxY = Math.max(maxY, cv.y + ch);
    });

    if (minX === Infinity) return;

    const neededW = maxX + PADDING;
    const neededH = maxY + PADDING;
    const currentW = sectionVisual.width ?? 400;
    const currentH = sectionVisual.height ?? 300;

    const newW = Math.max(currentW, neededW);
    const newH = Math.max(currentH, neededH);

    if (newW !== currentW || newH !== currentH) {
      set((state) => ({
        visualData: {
          ...state.visualData,
          layoutNodes: {
            ...state.visualData.layoutNodes,
            [sectionId]: { ...state.visualData.layoutNodes[sectionId], width: newW, height: newH }
          }
        },
        isDirty: true
      }));

      // If this section is nested inside a parent section, recursively resize parent
      const secLogical = state.logicalData.nodes.find(n => n.id === sectionId);
      if (secLogical?.parentId) {
        get().autoResizeSection(secLogical.parentId);
      }
    }
  },

  deleteSectionWithChoice: (sectionId, deleteChildren) => {
    get().pushToHistory();
    set((state) => {
      const sectionLogical = state.logicalData.nodes.find(n => n.id === sectionId);
      const sectionVisual = state.visualData.layoutNodes[sectionId];

      let nodes: typeof state.logicalData.nodes;
      const layoutNodes = { ...state.visualData.layoutNodes };
      const layoutEdges = { ...state.visualData.layoutEdges };
      const timelines = { ...state.visualData.timelines };

      if (deleteChildren) {
        const collectDescendants = (parentId: string): string[] => {
          const children = state.logicalData.nodes.filter(n => n.parentId === parentId);
          return children.flatMap(c => [c.id, ...collectDescendants(c.id)]);
        };
        const childIds = collectDescendants(sectionId);
        const allDeleteIds = new Set([sectionId, ...childIds]);
        nodes = state.logicalData.nodes.filter(n => !allDeleteIds.has(n.id));

        const deletedEdgeIds = state.logicalData.edges
          .filter(e => allDeleteIds.has(e.sourceId) || allDeleteIds.has(e.targetId))
          .map(e => e.id);
          
        const edges = state.logicalData.edges.filter(e => !allDeleteIds.has(e.sourceId) && !allDeleteIds.has(e.targetId));
        const sequences = state.logicalData.sequences.filter(s => !deletedEdgeIds.includes(s.edgeId));
        
        allDeleteIds.forEach(id => delete layoutNodes[id]);
        deletedEdgeIds.forEach(eid => delete layoutEdges[eid]);
        
        state.logicalData.sequences.forEach(s => {
          if (deletedEdgeIds.includes(s.edgeId)) {
            delete timelines[s.id];
          }
        });

        return {
          logicalData: { ...state.logicalData, nodes, edges, sequences },
          visualData: { ...state.visualData, layoutNodes, layoutEdges, timelines },
          isDirty: true
        };
      } else {
        nodes = state.logicalData.nodes.filter(n => n.id !== sectionId).map(n => {
          if (n.parentId === sectionId) {
            const childVisual = state.visualData.layoutNodes[n.id];
            if (childVisual && sectionVisual) {
              layoutNodes[n.id] = {
                ...childVisual,
                x: sectionVisual.x + childVisual.x,
                y: sectionVisual.y + childVisual.y
              };
            }
            return { ...n, parentId: sectionLogical?.parentId };
          }
          return n;
        });

        const deletedEdgeIds = state.logicalData.edges
          .filter(e => e.sourceId === sectionId || e.targetId === sectionId)
          .map(e => e.id);
          
        const edges = state.logicalData.edges.filter(e => e.sourceId !== sectionId && e.targetId !== sectionId);
        const sequences = state.logicalData.sequences.filter(s => !deletedEdgeIds.includes(s.edgeId));
        
        delete layoutNodes[sectionId];
        deletedEdgeIds.forEach(eid => delete layoutEdges[eid]);
        
        state.logicalData.sequences.forEach(s => {
          if (deletedEdgeIds.includes(s.edgeId)) {
            delete timelines[s.id];
          }
        });

        return {
          logicalData: { ...state.logicalData, nodes, edges, sequences },
          visualData: { ...state.visualData, layoutNodes, layoutEdges, timelines },
          isDirty: true
        };
      }
    });
  },

  alignSelectedNodes: (nodeIds: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (nodeIds.length < 2) return;
    get().pushToHistory();
    set((state) => {
      const layoutNodes = { ...state.visualData.layoutNodes };
      const targets = nodeIds
        .map((id: string) => ({ id, node: layoutNodes[id] }))
        .filter((t: { id: string; node: any }) => !!t.node);
      if (targets.length < 2) return state;

      const getNodeW = (id: string) => {
        const vn = layoutNodes[id];
        if (vn?.width) return vn.width;
        if (state.visualData.annotations?.[id]) return 220;
        const ln = state.logicalData.nodes.find((n) => n.id === id);
        if (ln?.type === 'section') return 400;
        if (ln?.type === 'freeform') return 320;
        return 224;
      };

      const getNodeH = (id: string) => {
        const vn = layoutNodes[id];
        if (vn?.height) return vn.height;
        if (state.visualData.annotations?.[id]) return 160;
        const ln = state.logicalData.nodes.find((n) => n.id === id);
        if (ln?.type === 'section') return 300;
        if (ln?.type === 'freeform') return 220;
        return 52;
      };

      const getAbsPos = (id: string): { x: number; y: number } => {
        const vn = layoutNodes[id] || { x: 0, y: 0 };
        const ln = state.logicalData.nodes.find((n: any) => n.id === id);
        if (ln && ln.parentId) {
          const pAbs = getAbsPos(ln.parentId);
          return { x: vn.x + pAbs.x, y: vn.y + pAbs.y };
        }
        return { x: vn.x, y: vn.y };
      };

      const setAbsPos = (id: string, absX: number, absY: number) => {
        const ln = state.logicalData.nodes.find((n: any) => n.id === id);
        if (ln && ln.parentId) {
          const pAbs = getAbsPos(ln.parentId);
          layoutNodes[id] = { ...layoutNodes[id], x: Math.round(absX - pAbs.x), y: Math.round(absY - pAbs.y) };
        } else {
          layoutNodes[id] = { ...layoutNodes[id], x: Math.round(absX), y: Math.round(absY) };
        }
      };

      if (alignment === 'left') {
        const minX = Math.min(...targets.map((t) => getAbsPos(t.id).x));
        targets.forEach((t) => {
          setAbsPos(t.id, minX, getAbsPos(t.id).y);
        });
      } else if (alignment === 'center') {
        const minX = Math.min(...targets.map((t) => getAbsPos(t.id).x));
        const maxX = Math.max(...targets.map((t) => getAbsPos(t.id).x + getNodeW(t.id)));
        const centerX = (minX + maxX) / 2;
        targets.forEach((t) => {
          const w = getNodeW(t.id);
          setAbsPos(t.id, Math.round(centerX - w / 2), getAbsPos(t.id).y);
        });
      } else if (alignment === 'right') {
        const maxRight = Math.max(...targets.map((t) => getAbsPos(t.id).x + getNodeW(t.id)));
        targets.forEach((t) => {
          const w = getNodeW(t.id);
          setAbsPos(t.id, maxRight - w, getAbsPos(t.id).y);
        });
      } else if (alignment === 'top') {
        const minY = Math.min(...targets.map((t) => getAbsPos(t.id).y));
        targets.forEach((t) => {
          setAbsPos(t.id, getAbsPos(t.id).x, minY);
        });
      } else if (alignment === 'middle') {
        const minY = Math.min(...targets.map((t) => getAbsPos(t.id).y));
        const maxY = Math.max(...targets.map((t) => getAbsPos(t.id).y + getNodeH(t.id)));
        const centerY = (minY + maxY) / 2;
        targets.forEach((t) => {
          const h = getNodeH(t.id);
          setAbsPos(t.id, getAbsPos(t.id).x, Math.round(centerY - h / 2));
        });
      } else if (alignment === 'bottom') {
        const maxBottom = Math.max(...targets.map((t) => getAbsPos(t.id).y + getNodeH(t.id)));
        targets.forEach((t) => {
          const h = getNodeH(t.id);
          setAbsPos(t.id, getAbsPos(t.id).x, maxBottom - h);
        });
      }

      return {
        visualData: { ...state.visualData, layoutNodes },
        layoutVersion: (state.layoutVersion || 0) + 1,
        isDirty: true
      };
    });
  },

  distributeSelectedNodes: (nodeIds: string[], direction: 'horizontal' | 'vertical') => {
    if (nodeIds.length < 3) return;
    get().pushToHistory();
    set((state) => {
      const layoutNodes = { ...state.visualData.layoutNodes };
      const targets = nodeIds
        .map((id: string) => ({ id, node: layoutNodes[id] }))
        .filter((t: { id: string; node: any }) => !!t.node);
      if (targets.length < 3) return state;

      const getNodeW = (id: string) => {
        const vn = layoutNodes[id];
        if (vn?.width) return vn.width;
        if (state.visualData.annotations?.[id]) return 220;
        const ln = state.logicalData.nodes.find((n) => n.id === id);
        if (ln?.type === 'section') return 400;
        if (ln?.type === 'freeform') return 320;
        return 224;
      };

      const getNodeH = (id: string) => {
        const vn = layoutNodes[id];
        if (vn?.height) return vn.height;
        if (state.visualData.annotations?.[id]) return 160;
        const ln = state.logicalData.nodes.find((n) => n.id === id);
        if (ln?.type === 'section') return 300;
        if (ln?.type === 'freeform') return 220;
        return 52;
      };

      const getAbsPos = (id: string): { x: number; y: number } => {
        const vn = layoutNodes[id] || { x: 0, y: 0 };
        const ln = state.logicalData.nodes.find((n: any) => n.id === id);
        if (ln && ln.parentId) {
          const pAbs = getAbsPos(ln.parentId);
          return { x: vn.x + pAbs.x, y: vn.y + pAbs.y };
        }
        return { x: vn.x, y: vn.y };
      };

      const setAbsPos = (id: string, absX: number, absY: number) => {
        const ln = state.logicalData.nodes.find((n: any) => n.id === id);
        if (ln && ln.parentId) {
          const pAbs = getAbsPos(ln.parentId);
          layoutNodes[id] = { ...layoutNodes[id], x: Math.round(absX - pAbs.x), y: Math.round(absY - pAbs.y) };
        } else {
          layoutNodes[id] = { ...layoutNodes[id], x: Math.round(absX), y: Math.round(absY) };
        }
      };

      if (direction === 'horizontal') {
        targets.sort((a, b) => getAbsPos(a.id).x - getAbsPos(b.id).x);
        const first = targets[0];
        const last = targets[targets.length - 1];
        
        const firstRight = getAbsPos(first.id).x + getNodeW(first.id);
        const lastLeft = getAbsPos(last.id).x;
        const innerWidthSum = targets.slice(1, -1).reduce((sum, t) => sum + getNodeW(t.id), 0);
        const totalGap = lastLeft - firstRight - innerWidthSum;
        const gap = Math.max(16, Math.round(totalGap / (targets.length - 1)));

        let currentX = firstRight + gap;
        for (let i = 1; i < targets.length - 1; i++) {
          const t = targets[i];
          setAbsPos(t.id, currentX, getAbsPos(t.id).y);
          currentX += getNodeW(t.id) + gap;
        }
      } else {
        targets.sort((a, b) => getAbsPos(a.id).y - getAbsPos(b.id).y);
        const first = targets[0];
        const last = targets[targets.length - 1];

        const firstBottom = getAbsPos(first.id).y + getNodeH(first.id);
        const lastTop = getAbsPos(last.id).y;
        const innerHeightSum = targets.slice(1, -1).reduce((sum, t) => sum + getNodeH(t.id), 0);
        const totalGap = lastTop - firstBottom - innerHeightSum;
        const gap = Math.max(16, Math.round(totalGap / (targets.length - 1)));

        let currentY = firstBottom + gap;
        for (let i = 1; i < targets.length - 1; i++) {
          const t = targets[i];
          setAbsPos(t.id, getAbsPos(t.id).x, currentY);
          currentY += getNodeH(t.id) + gap;
        }
      }

      return {
        visualData: { ...state.visualData, layoutNodes },
        layoutVersion: (state.layoutVersion || 0) + 1,
        isDirty: true
      };
    });
  },

  packNodesIntoSection: (nodeIds: string[], title?: string) => {
    if (nodeIds.length === 0) return;
    get().pushToHistory();
    set((state) => {
      const layoutNodes = { ...state.visualData.layoutNodes };
      const targets = nodeIds
        .map((id: string) => ({
          id,
          logical: state.logicalData.nodes.find(n => n.id === id),
          visual: layoutNodes[id]
        }))
        .filter((t: any) => !!t.logical && !!t.visual);

      if (targets.length === 0) return state;

      const getNodeW = (id: string) => {
        const vn = layoutNodes[id];
        if (vn?.width) return vn.width;
        if (state.visualData.annotations?.[id]) return 220;
        const ln = state.logicalData.nodes.find((n) => n.id === id);
        if (ln?.type === 'section') return 400;
        if (ln?.type === 'freeform') return 320;
        return 224;
      };

      const getNodeH = (id: string) => {
        const vn = layoutNodes[id];
        if (vn?.height) return vn.height;
        if (state.visualData.annotations?.[id]) return 160;
        const ln = state.logicalData.nodes.find((n) => n.id === id);
        if (ln?.type === 'section') return 300;
        if (ln?.type === 'freeform') return 220;
        return 52;
      };

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      targets.forEach((t: any) => {
        minX = Math.min(minX, t.visual.x);
        minY = Math.min(minY, t.visual.y);
        maxX = Math.max(maxX, t.visual.x + getNodeW(t.id));
        maxY = Math.max(maxY, t.visual.y + getNodeH(t.id));
      });

      const PADDING_H = 32;
      const PADDING_TOP = 64;
      const PADDING_BOTTOM = 32;

      const secX = Math.round(minX - PADDING_H);
      const secY = Math.round(minY - PADDING_TOP);
      const secW = Math.round((maxX - minX) + PADDING_H * 2);
      const secH = Math.round((maxY - minY) + PADDING_TOP + PADDING_BOTTOM);

      const secId = 'sec-' + Math.random().toString(36).slice(2, 9);
      const defaultTitle = state.language === 'tr' ? 'Yeni Bölüm' : 'New Section';

      const firstParent = targets[0]?.logical?.parentId;
      const allShareSameParent = targets.every((t: any) => t.logical?.parentId === firstParent);
      const commonParentId = allShareSameParent ? firstParent : undefined;

      const newSectionLogical = {
        id: secId,
        type: 'section',
        name: title || defaultTitle,
        ...(commonParentId ? { parentId: commonParentId } : {}),
      };

      const newSectionVisual = {
        id: secId,
        x: secX,
        y: secY,
        width: secW,
        height: secH,
        color: '#6366f1',
      };

      const updatedLogicalNodes = state.logicalData.nodes.map((n) => {
        if (nodeIds.includes(n.id)) {
          return { ...n, parentId: secId };
        }
        return n;
      });
      updatedLogicalNodes.push(newSectionLogical);

      targets.forEach((t: any) => {
        layoutNodes[t.id] = {
          ...layoutNodes[t.id],
          x: Math.round(t.visual.x - secX),
          y: Math.round(t.visual.y - secY),
        };
      });
      layoutNodes[secId] = newSectionVisual;

      if (commonParentId) {
        setTimeout(() => {
          get().autoResizeSection(commonParentId);
        }, 0);
      }

      return {
        logicalData: { ...state.logicalData, nodes: updatedLogicalNodes },
        visualData: { ...state.visualData, layoutNodes },
        layoutVersion: (state.layoutVersion || 0) + 1,
        isDirty: true,
      };
    });
  },

  deleteSelectedNodes: (nodeIds: string[]) => {
    if (nodeIds.length === 0) return;
    get().pushToHistory();
    set((state) => {
      const nodeSet = new Set(nodeIds);
      const nodes = state.logicalData.nodes.filter((n) => !nodeSet.has(n.id));
      const edges = state.logicalData.edges.filter((e) => !nodeSet.has(e.sourceId) && !nodeSet.has(e.targetId));
      const remainingEdgeIds = new Set(edges.map((e) => e.id));
      const sequences = state.logicalData.sequences.filter((s) => remainingEdgeIds.has(s.edgeId));

      const layoutNodes = { ...state.visualData.layoutNodes };
      nodeIds.forEach((id: string) => {
        delete layoutNodes[id];
      });

      const layoutEdges = { ...state.visualData.layoutEdges };
      const schedules = { ...state.schedules };
      const timelines = { ...state.visualData.timelines };

      Object.keys(layoutEdges).forEach((edgeId: string) => {
        if (!remainingEdgeIds.has(edgeId)) {
          delete layoutEdges[edgeId];
        }
      });

      const sortedSeqs = [...sequences].sort((a, b) => a.stepNumber - b.stepNumber);
      const reindexedSeqs = sortedSeqs.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));

      return {
        logicalData: { ...state.logicalData, nodes, edges, sequences: reindexedSeqs },
        visualData: { ...state.visualData, layoutNodes, layoutEdges, timelines },
        schedules,
        layoutVersion: (state.layoutVersion || 0) + 1,
        isDirty: true
      };
    });
  },


  applyAutoLayout: (direction) => {
    get().pushToHistory();
    const state = get();
    const { nodes, edges } = state.logicalData;

    // Helper map to find node parentIds
    const nodeParentMap = new Map<string, string | undefined>(
      nodes.map(n => [n.id, n.parentId])
    );

    // 1. Only include top-level nodes for Dagre (ignore children of sections)
    const topLevelNodes = nodes.filter(n => !n.parentId);

    const rfNodes = topLevelNodes.map((node) => {
      const visual = state.visualData.layoutNodes[node.id] || {};
      return {
        id: node.id,
        position: { x: visual.x ?? 0, y: visual.y ?? 0 },
        data: { name: node.name, type: node.type },
        width: visual.width ?? (node.type === 'section' ? 400 : 224),
        height: visual.height ?? (node.type === 'section' ? 300 : 52),
      };
    });

    // 2. Map edges: if source/target is inside a section, point to section.
    // Discard edges where both source and target map to the same section.
    const mappedEdges: { id: string; source: string; target: string }[] = [];
    edges.forEach((edge) => {
      const parentSrc = nodeParentMap.get(edge.sourceId);
      const parentTgt = nodeParentMap.get(edge.targetId);

      const actualSource = parentSrc || edge.sourceId;
      const actualTarget = parentTgt || edge.targetId;

      if (actualSource !== actualTarget) {
        mappedEdges.push({
          id: edge.id,
          source: actualSource,
          target: actualTarget,
        });
      }
    });

    // 3. Calculate layout
    const layouted = getLayoutedElements(rfNodes, mappedEdges as any, direction);

    // 4. Update coordinates only for the top-level nodes Dagre processed
    const layoutNodes = { ...state.visualData.layoutNodes };
    layouted.forEach((node) => {
      layoutNodes[node.id] = {
        ...layoutNodes[node.id],
        x: node.position.x,
        y: node.position.y,
      };
    });

    // Update edge handles in visual layer based on layout direction (excluding internal section edges)
    const newSourceHandle: string = direction === 'TB' ? 'bottom:50' : 'right:50';
    const newTargetHandle: string = direction === 'TB' ? 'top:50' : 'left:50';
    const layoutEdges = { ...state.visualData.layoutEdges };
    edges.forEach((edge) => {
      const parentSrc = nodeParentMap.get(edge.sourceId);
      const parentTgt = nodeParentMap.get(edge.targetId);
      if (parentSrc && parentTgt && parentSrc === parentTgt) {
        // Internal to a section, keep original handles
        return;
      }
      const existingVE = layoutEdges[edge.id] ?? { id: edge.id };
      layoutEdges[edge.id] = { ...existingVE, sourceHandle: newSourceHandle, targetHandle: newTargetHandle };
    });

    set({
      logicalData: { ...state.logicalData },
      visualData: { ...state.visualData, layoutNodes, layoutEdges },
      layoutVersion: state.layoutVersion + 1,
      autoLayoutVersion: (state.autoLayoutVersion || 0) + 1,
      isDirty: true
    });
  }
});
