import { useCallback } from 'react';
import { Node } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';
import {
  getNodeAbsolutePosition,
  findDeepestContainingSection,
} from './sectionHierarchyUtils';

export const useSectionDrag = () => {
  const updateNodePosition = useAppStore((s) => s.updateNodePosition);
  const setNodeParent = useAppStore((s) => s.setNodeParent);
  const autoResizeSection = useAppStore((s) => s.autoResizeSection);

  const onNodeDragStop = useCallback(
    (_event: any, draggedNode: Node) => {
      const state = useAppStore.getState();
      const logicalNodes = state.logicalData.nodes;
      const layoutNodes = state.visualData.layoutNodes;

      const draggedLogical = logicalNodes.find((n) => n.id === draggedNode.id);
      if (!draggedLogical) return;

      const currentParent = draggedLogical.parentId ?? null;

      // Calculate dragged node dimensions and center
      const dragW = draggedNode.width ?? (draggedLogical.type === 'section' ? 400 : 224);
      const dragH = draggedNode.height ?? (draggedLogical.type === 'section' ? 300 : 52);

      // draggedNode.position is relative to currentParent (or canvas-absolute if no parent)
      let absDragX = draggedNode.position.x;
      let absDragY = draggedNode.position.y;

      if (currentParent) {
        const parentAbs = getNodeAbsolutePosition(currentParent, logicalNodes, layoutNodes);
        absDragX += parentAbs.x;
        absDragY += parentAbs.y;
      }

      const absDragCX = absDragX + dragW / 2;
      const absDragCY = absDragY + dragH / 2;

      // Find deepest section containing the center of the dragged node
      const targetSection = findDeepestContainingSection(
        { x: absDragCX, y: absDragCY },
        logicalNodes,
        layoutNodes,
        draggedNode.id
      );

      if (targetSection && targetSection !== currentParent) {
        // Moving into a new (or deeper / outer) section
        const targetAbs = getNodeAbsolutePosition(targetSection, logicalNodes, layoutNodes);
        const relX = Math.round(absDragX - targetAbs.x);
        const relY = Math.round(absDragY - targetAbs.y);

        updateNodePosition(draggedNode.id, relX, relY);
        setNodeParent(draggedNode.id, targetSection);
        autoResizeSection(targetSection);
        if (currentParent) {
          autoResizeSection(currentParent);
        }
      } else if (!targetSection && currentParent) {
        // Leaving section hierarchy to root canvas
        const absX = Math.round(absDragX);
        const absY = Math.round(absDragY);

        updateNodePosition(draggedNode.id, absX, absY);
        setNodeParent(draggedNode.id, null);
        autoResizeSection(currentParent);
      } else {
        // Position update inside the same parent or root canvas
        updateNodePosition(draggedNode.id, draggedNode.position.x, draggedNode.position.y);
        if (targetSection) {
          autoResizeSection(targetSection);
        }
      }
    },
    [updateNodePosition, setNodeParent, autoResizeSection]
  );

  return { onNodeDragStop };
};

