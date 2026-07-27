import { useEffect, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';

export const useCanvasShortcuts = (
  closeMenu: () => void,
  closePopover: () => void,
  rfNodes?: Node[],
  setRfNodes?: React.Dispatch<React.SetStateAction<Node[]>>,
  rfEdges?: Edge[],
  setRfEdges?: React.Dispatch<React.SetStateAction<Edge[]>>
) => {
  const cancelDrag = useAppStore((s) => s.cancelDrag);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const deleteNode = useAppStore((s) => s.deleteNode);
  const deleteEdge = useAppStore((s) => s.deleteEdge);
  const deleteStickyNote = useAppStore((s) => s.deleteStickyNote);
  const copiedNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if typing in input, textarea, select, or contentEditable
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT' ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (e.key === 'Escape' && useAppStore.getState().pendingDrop) {
        cancelDrag();
      }
      if (e.key === 'Escape') {
        closeMenu();
        closePopover();
      }

      if (isInputFocused) {
        return;
      }

      // Delete hotkey: Backspace or Delete
      const isDeleteKey = e.key === 'Backspace' || e.key === 'Delete';

      if (isDeleteKey) {
        const currentRfNodes = rfNodes || [];
        const currentRfEdges = rfEdges || [];

        const selectedNodes = currentRfNodes.filter((n) => n.selected);
        const selectedEdges = currentRfEdges.filter((e) => e.selected);

        const activeNodeId = useAppStore.getState().activeNodeProperties?.id;
        const activeEdgeId = useAppStore.getState().activeEdgeProperties?.id;

        let deletedSomething = false;

        if (selectedNodes.length > 0) {
          e.preventDefault();
          deletedSomething = true;
          const state = useAppStore.getState();
          selectedNodes.forEach((n) => {
            const isSticky = n.type === 'stickyNoteNode' || state.visualData.annotations?.[n.id];
            if (isSticky) {
              deleteStickyNote(n.id);
            } else {
              deleteNode(n.id);
            }
          });
          if (setRfNodes) {
            setRfNodes((nds) => nds.filter((n) => !selectedNodes.some((sn) => sn.id === n.id)));
          }
        }

        if (selectedEdges.length > 0) {
          e.preventDefault();
          deletedSomething = true;
          selectedEdges.forEach((ed) => {
            deleteEdge(ed.id);
          });
          if (setRfEdges) {
            setRfEdges((eds) => eds.filter((ed) => !selectedEdges.some((se) => se.id === ed.id)));
          }
        }

        if (!deletedSomething && activeNodeId) {
          e.preventDefault();
          const state = useAppStore.getState();
          const isSticky = state.visualData.annotations?.[activeNodeId];
          if (isSticky) deleteStickyNote(activeNodeId);
          else deleteNode(activeNodeId);
          useAppStore.getState().setActiveNodeProperties(null);
          if (setRfNodes) {
            setRfNodes((nds) => nds.filter((n) => n.id !== activeNodeId));
          }
        } else if (!deletedSomething && activeEdgeId) {
          e.preventDefault();
          deleteEdge(activeEdgeId);
          useAppStore.getState().setActiveEdgeProperties(null);
          if (setRfEdges) {
            setRfEdges((eds) => eds.filter((ed) => ed.id !== activeEdgeId));
          }
        }
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

      // Copy hotkey
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const activeNodeId = useAppStore.getState().activeNodeProperties?.id || useAppStore.getState().focusedNodeId;
        if (activeNodeId) {
          e.preventDefault();
          copiedNodeIdRef.current = activeNodeId;
        }
      }

      // Paste hotkey
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (copiedNodeIdRef.current) {
          e.preventDefault();
          const cloneNode = useAppStore.getState().cloneNode;
          cloneNode(copiedNodeIdRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDrag, closeMenu, undo, redo, closePopover, rfNodes, setRfNodes, rfEdges, setRfEdges, deleteNode, deleteEdge, deleteStickyNote]);
};
