import { useState, useCallback } from 'react';
import { NodeChange } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';

export interface AlignmentLine {
  type: 'horizontal' | 'vertical';
  pos: number;
  start: number;
  end: number;
}

export const useSnapping = () => {
  const [alignmentLines, setAlignmentLines] = useState<AlignmentLine[]>([]);

  const handleSnapping = useCallback((changes: NodeChange[]) => {
    const positionChanges = changes.filter(
      (c) => c.type === 'position' && c.position
    ) as any[];

    if (positionChanges.length === 1 && positionChanges[0].dragging) {
      const change = positionChanges[0];
      const state = useAppStore.getState();
      const otherNodes = state.logicalData.nodes.filter((n) => n.id !== change.id);
      
      const vnDrag = state.visualData.layoutNodes[change.id] ?? { x: 0, y: 0 };
      const dragW = vnDrag.width ?? 150;
      const dragH = vnDrag.height ?? 48;

      let snappedX = change.position.x;
      let snappedY = change.position.y;
      const threshold = 15;
      const lines: AlignmentLine[] = [];
      
      otherNodes.forEach((n) => {
        const vn = state.visualData.layoutNodes[n.id];
        if (!vn) return;
        const otherW = vn.width ?? 150;
        const otherH = vn.height ?? 48;

        // snap x (vertical alignment line)
        // 1. Left-to-Left
        if (Math.abs(vn.x - change.position.x) < threshold) {
          snappedX = vn.x;
          lines.push({ 
            type: 'vertical', 
            pos: vn.x, 
            start: Math.min(vn.y, change.position.y), 
            end: Math.max(vn.y + otherH, change.position.y + dragH) 
          });
        }
        // 2. Center-to-Center X
        else if (Math.abs((vn.x + otherW / 2) - (change.position.x + dragW / 2)) < threshold) {
          snappedX = vn.x + otherW / 2 - dragW / 2;
          lines.push({ 
            type: 'vertical', 
            pos: vn.x + otherW / 2, 
            start: Math.min(vn.y, change.position.y), 
            end: Math.max(vn.y + otherH, change.position.y + dragH) 
          });
        }
        // 3. Right-to-Right
        else if (Math.abs((vn.x + otherW) - (change.position.x + dragW)) < threshold) {
          snappedX = vn.x + otherW - dragW;
          lines.push({ 
            type: 'vertical', 
            pos: vn.x + otherW, 
            start: Math.min(vn.y, change.position.y), 
            end: Math.max(vn.y + otherH, change.position.y + dragH) 
          });
        }

        // snap y (horizontal alignment line)
        // 1. Top-to-Top
        if (Math.abs(vn.y - change.position.y) < threshold) {
          snappedY = vn.y;
          lines.push({ 
            type: 'horizontal', 
            pos: vn.y, 
            start: Math.min(vn.x, change.position.x), 
            end: Math.max(vn.x + otherW, change.position.x + dragW) 
          });
        }
        // 2. Center-to-Center Y
        else if (Math.abs((vn.y + otherH / 2) - (change.position.y + dragH / 2)) < threshold) {
          snappedY = vn.y + otherH / 2 - dragH / 2;
          lines.push({ 
            type: 'horizontal', 
            pos: vn.y + otherH / 2, 
            start: Math.min(vn.x, change.position.x), 
            end: Math.max(vn.x + otherW, change.position.x + dragW) 
          });
        }
        // 3. Bottom-to-Bottom
        else if (Math.abs((vn.y + otherH) - (change.position.y + dragH)) < threshold) {
          snappedY = vn.y + otherH - dragH;
          lines.push({ 
            type: 'horizontal', 
            pos: vn.y + otherH, 
            start: Math.min(vn.x, change.position.x), 
            end: Math.max(vn.x + otherW, change.position.x + dragW) 
          });
        }
      });
      
      change.position.x = snappedX;
      change.position.y = snappedY;
      if (change.positionAbsolute) {
        change.positionAbsolute.x = snappedX;
        change.positionAbsolute.y = snappedY;
      }
      setAlignmentLines(lines);
    } else if (!changes.some((c) => c.type === 'position' && c.dragging)) {
      setAlignmentLines([]);
    }
  }, []);

  return {
    alignmentLines,
    handleSnapping,
    clearAlignmentLines: useCallback(() => setAlignmentLines([]), []),
  };
};
