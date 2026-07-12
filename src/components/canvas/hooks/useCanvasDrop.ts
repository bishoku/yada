import { useEffect, RefObject } from 'react';
import { Node } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';
import { toRfNode } from './utils';

export const useCanvasDrop = (
  wrapperRef: RefObject<HTMLDivElement | null>,
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number },
  setRfNodes: React.Dispatch<React.SetStateAction<Node[]>>
) => {
  const addNode = useAppStore((s) => s.addNode);
  const cancelDrag = useAppStore((s) => s.cancelDrag);

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
  }, [screenToFlowPosition, setRfNodes, addNode, cancelDrag, wrapperRef]);
};
