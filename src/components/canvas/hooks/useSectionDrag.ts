import { useCallback } from 'react';
import { Node } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';

export const useSectionDrag = () => {
  const updateNodePosition = useAppStore((s) => s.updateNodePosition);
  const setNodeParent = useAppStore((s) => s.setNodeParent);
  const autoResizeSection = useAppStore((s) => s.autoResizeSection);

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

  return { onNodeDragStop };
};
