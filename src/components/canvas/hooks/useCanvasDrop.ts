import { message } from '../../../i18n/messages';
import { useEffect, RefObject } from 'react';
import { Node } from '@xyflow/react';
import { useAppStore, setDiagramDataInStore } from '../../../store/useAppStore';
import { toRfNode } from './utils';
import { generateNodeId } from '../../../utils/idGenerator';
import { extractPngMetadata, extractSvgMetadata } from '../../../utils/imageMetadata';
import { repairDiagram } from '../../../utils/workspaceZip';


export const useCanvasDrop = (
  wrapperRef: RefObject<HTMLDivElement | null>,
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number },
  setRfNodes: React.Dispatch<React.SetStateAction<Node[]>>
) => {
  const addNode = useAppStore((s) => s.addNode);
  const addStickyNote = useAppStore((s) => s.addStickyNote);
  const cancelDrag = useAppStore((s) => s.cancelDrag);
  const openAlert = useAppStore((s) => s.openAlert);
  const language = useAppStore((s) => s.language);
  const pushToHistory = useAppStore((s) => s.pushToHistory);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // ── Handle Component Drag from Left Sidebar ──────────────────────────────
    const handleMouseUp = (e: Pick<MouseEvent, 'clientX' | 'clientY'>) => {
      const current = useAppStore.getState().pendingDrop;
      if (!current) return;

      const el = wrapperRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const isInsideCanvas =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isInsideCanvas) return;

      const { type, name } = current;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const nodeId = generateNodeId(type);

      const isSection = type === 'section';
      const isStickyNote = type === 'sticky_note';
      const isFreeForm = type === 'freeform';
      const width = isSection ? 400 : isStickyNote ? 220 : isFreeForm ? 320 : 224;
      const height = isSection ? 300 : isStickyNote ? 160 : isFreeForm ? 220 : 52;

      const x = position.x - width / 2;
      const y = position.y - height / 2;

      const visualNode = {
        id: nodeId,
        x,
        y,
        width,
        height,
        theme: 'white',
        customStyles: { borderOnly: false },
        ...(isSection ? { zIndex: -1 } : {})
      };

      // Calculate unique name with index
      const state = useAppStore.getState();
      const logicalNames = state.logicalData.nodes.map((n) => n.name);
      const annotationNames = Object.values(state.visualData.annotations || {}).map((a) => a.header);
      const existingNames = [...logicalNames, ...annotationNames];

      let index = 1;
      let uniqueName = `${name} ${index}`;
      while (existingNames.includes(uniqueName)) {
        index++;
        uniqueName = `${name} ${index}`;
      }

      const newNode: Node = toRfNode({ id: nodeId, type, name: uniqueName }, visualNode);

      if (isStickyNote) {
        const currentTime = useAppStore.getState().currentTime;
        const startTime = currentTime;
        const endTime = startTime + 5000; // Default 5 seconds duration

        const annotation = {
          id: nodeId,
          header: uniqueName,
          body: message(language, 'useCanvasDrop.noteHint'),
          style: {
            backgroundColor: '#fef08a', // yellow-200
            borderColor: '#eab308', // yellow-500
            textColor: '#422006', // yellow-950
            fontFamily: 'Inter',
            fontSize: 14,
            borderRadius: 8,
            opacity: 1,
            shadow: true
          },
          startTime,
          endTime,
          alwaysVisible: true
        };
        addStickyNote(visualNode, annotation);
      } else {
        setRfNodes((nds) => isSection ? [newNode, ...nds] : [...nds, newNode]);
        const logicalNode = { id: nodeId, type, name: uniqueName };
        addNode(logicalNode, visualNode);
      }

      cancelDrag();
    };

    // ── Handle OS File Drag-and-Drop (PNG / SVG / JSON) ──────────────────────
    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.png')) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const buffer = await file.arrayBuffer();
          const extracted = extractPngMetadata(buffer) as any;
          if (extracted && (extracted.logicalData || extracted.logical)) {
            pushToHistory();
            const logData = extracted.logicalData || extracted.logical;
            const visData = extracted.visualData || extracted.visual;
            const repaired = repairDiagram(logData, visData);
            setDiagramDataInStore(repaired.logicalData, repaired.visualData, false);
            useAppStore.setState({ isDirty: true });
            openAlert({
              title: message(language, "useCanvasDrop.success"),
              message: message(language, "useCanvasDrop.embeddedYADADiagramFromPNGLoadedSuccessfully", { value1: file.name }),
            });
          } else {
            openAlert({
              title: message(language, "useCanvasDrop.notice"),
              message: message(language, "useCanvasDrop.noEmbeddedYADADiagramMetadataFoundIn"),
            });
          }
        } catch (err) {
          console.error('PNG import error:', err);
        }
      } else if (fileName.endsWith('.svg')) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const text = await file.text();
          const extracted = extractSvgMetadata(text) as any;
          if (extracted && (extracted.logicalData || extracted.logical)) {
            pushToHistory();
            const logData = extracted.logicalData || extracted.logical;
            const visData = extracted.visualData || extracted.visual;
            const repaired = repairDiagram(logData, visData);
            setDiagramDataInStore(repaired.logicalData, repaired.visualData, false);
            useAppStore.setState({ isDirty: true });
            openAlert({
              title: message(language, "useCanvasDrop.success"),
              message: message(language, "useCanvasDrop.embeddedYADADiagramFromSVGLoadedSuccessfully", { value1: file.name }),
            });
          } else {
            openAlert({
              title: message(language, "useCanvasDrop.notice"),
              message: message(language, "useCanvasDrop.noEmbeddedYADADiagramMetadataFoundIn2"),
            });
          }
        } catch (err) {
          console.error('SVG import error:', err);
        }
      }
    };

    const handleAddComponent = (event: Event) => {
      const state = useAppStore.getState();
      const { type, name } = (event as CustomEvent<{ type: string; name: string }>).detail;
      if (state.isReadOnly || !state.activeDiagramId || !type || !name) return;
      const rect = el.getBoundingClientRect();
      state.startDrag(type, name);
      handleMouseUp({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
    };
    window.addEventListener('canvas:addComponent', handleAddComponent);
    window.addEventListener('mouseup', handleMouseUp, { capture: true });
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('canvas:addComponent', handleAddComponent);
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('drop', handleDrop);
    };
  }, [screenToFlowPosition, setRfNodes, addNode, addStickyNote, cancelDrag, wrapperRef, openAlert, language, pushToHistory]);
};

