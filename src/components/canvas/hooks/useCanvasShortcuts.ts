import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';

export const useCanvasShortcuts = (
  closeMenu: () => void,
  closePopover: () => void
) => {
  const cancelDrag = useAppStore((s) => s.cancelDrag);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const copiedNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore copy/paste shortcuts if typing in input or textarea
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      
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
  }, [cancelDrag, closeMenu, undo, redo, closePopover]);
};
