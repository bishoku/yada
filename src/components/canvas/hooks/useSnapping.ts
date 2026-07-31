import { useState, useCallback, useEffect } from 'react';
import { NodeChange, NodePositionChange, NodeDimensionChange } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';

export interface AlignmentLine {
  type: 'horizontal' | 'vertical';
  pos: number;
  start: number;
  end: number;
  label?: string;
  labelX?: number;
  labelY?: number;
}

export const useSnapping = () => {
  const [alignmentLines, setAlignmentLines] = useState<AlignmentLine[]>([]);
  const [isBypassingSnap, setIsBypassingSnap] = useState(false);

  // Global listener for Alt/Shift to bypass snapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.shiftKey) setIsBypassingSnap(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && !e.shiftKey) setIsBypassingSnap(false);
    };
    const handleBlur = () => setIsBypassingSnap(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleSnapping = useCallback((changes: NodeChange[]) => {
    if (isBypassingSnap) {
      setAlignmentLines([]);
      return;
    }

    const positionChanges = changes.filter(
      (c) => c.type === 'position' && c.dragging && c.position
    ) as NodePositionChange[];

    const dimensionChanges = changes.filter(
      (c) => c.type === 'dimensions' && c.resizing && c.dimensions
    ) as NodeDimensionChange[];

    const state = useAppStore.getState();
    const threshold = 12; // Magnetic threshold

    if (positionChanges.length === 1) {
      const change = positionChanges[0];
      const otherNodes = state.logicalData.nodes.filter((n) => n.id !== change.id);
      const vnDrag = state.visualData.layoutNodes[change.id] ?? { x: 0, y: 0 };
      const dragW = vnDrag.width ?? 150;
      const dragH = vnDrag.height ?? 48;

      let snappedX = change.position!.x;
      let snappedY = change.position!.y;
      const lines: AlignmentLine[] = [];
      let snappedToX = false;
      let snappedToY = false;

      otherNodes.forEach((n) => {
        const vn = state.visualData.layoutNodes[n.id];
        if (!vn) return;
        const otherW = vn.width ?? 150;
        const otherH = vn.height ?? 48;

        // X-Axis Snapping (Vertical Lines)
        if (!snappedToX) {
          const xOptions = [
            { pos: vn.x, snapTo: vn.x, type: 'Left-Left' },
            { pos: vn.x + otherW / 2, snapTo: vn.x + otherW / 2 - dragW / 2, type: 'Center-Center' },
            { pos: vn.x + otherW, snapTo: vn.x + otherW - dragW, type: 'Right-Right' },
            { pos: vn.x, snapTo: vn.x - dragW, type: 'Left-Right' },
            { pos: vn.x + otherW, snapTo: vn.x, type: 'Right-Left' },
          ];

          for (const opt of xOptions) {
            if (Math.abs(opt.snapTo - change.position!.x) < threshold) {
              snappedX = opt.snapTo;
              snappedToX = true;
              lines.push({
                type: 'vertical',
                pos: opt.pos,
                start: Math.min(vn.y, change.position!.y) - 20,
                end: Math.max(vn.y + otherH, change.position!.y + dragH) + 20,
              });
              break;
            }
          }
        }

        // Y-Axis Snapping (Horizontal Lines)
        if (!snappedToY) {
          const yOptions = [
            { pos: vn.y, snapTo: vn.y, type: 'Top-Top' },
            { pos: vn.y + otherH / 2, snapTo: vn.y + otherH / 2 - dragH / 2, type: 'Center-Center' },
            { pos: vn.y + otherH, snapTo: vn.y + otherH - dragH, type: 'Bottom-Bottom' },
            { pos: vn.y, snapTo: vn.y - dragH, type: 'Top-Bottom' },
            { pos: vn.y + otherH, snapTo: vn.y, type: 'Bottom-Top' },
          ];

          for (const opt of yOptions) {
            if (Math.abs(opt.snapTo - change.position!.y) < threshold) {
              snappedY = opt.snapTo;
              snappedToY = true;
              lines.push({
                type: 'horizontal',
                pos: opt.pos,
                start: Math.min(vn.x, change.position!.x) - 20,
                end: Math.max(vn.x + otherW, change.position!.x + dragW) + 20,
              });
              break;
            }
          }
        }
      });

      // X-Axis Space Distribution
      if (!snappedToX) {
        let snappedToSpaceX = false;
        for (let i = 0; i < otherNodes.length; i++) {
          const n1 = state.visualData.layoutNodes[otherNodes[i].id];
          if (!n1) continue;
          const n1W = n1.width ?? 150;
          const n1H = n1.height ?? 48;
          
          if (!(change.position!.y < n1.y + n1H && change.position!.y + dragH > n1.y)) continue;

          for (let j = 0; j < otherNodes.length; j++) {
            if (i === j) continue;
            const n2 = state.visualData.layoutNodes[otherNodes[j].id];
            if (!n2) continue;
            const n2W = n2.width ?? 150;
            const n2H = n2.height ?? 48;

            if (!(n1.y < n2.y + n2H && n1.y + n1H > n2.y)) continue;

            let gap = 0;
            let n1LeftOfN2 = true;
            if (n1.x + n1W < n2.x) {
               gap = n2.x - (n1.x + n1W);
               n1LeftOfN2 = true;
            } else if (n2.x + n2W < n1.x) {
               gap = n1.x - (n2.x + n2W);
               n1LeftOfN2 = false;
            } else {
               continue;
            }

            if (gap > 0 && gap < 500) {
               const minX = Math.min(n1.x, n2.x);
               const maxX = Math.max(n1.x + n1W, n2.x + n2W);
               
               const snapLeft = minX - gap - dragW;
               const snapRight = maxX + gap;

               if (Math.abs(change.position!.x - snapLeft) < threshold) {
                 snappedX = snapLeft;
                 snappedToSpaceX = true;
                 lines.push({ type: 'horizontal', pos: change.position!.y + dragH/2, start: snapLeft + dragW, end: minX, label: `${Math.round(gap)}px`, labelX: snapLeft + dragW + gap/2, labelY: change.position!.y + dragH/2 });
                 lines.push({ type: 'horizontal', pos: change.position!.y + dragH/2, start: n1LeftOfN2 ? n1.x + n1W : n2.x + n2W, end: n1LeftOfN2 ? n2.x : n1.x, label: `${Math.round(gap)}px`, labelX: (n1LeftOfN2 ? n1.x + n1W : n2.x + n2W) + gap/2, labelY: change.position!.y + dragH/2 });
                 break;
               } else if (Math.abs(change.position!.x - snapRight) < threshold) {
                 snappedX = snapRight;
                 snappedToSpaceX = true;
                 lines.push({ type: 'horizontal', pos: change.position!.y + dragH/2, start: maxX, end: snapRight, label: `${Math.round(gap)}px`, labelX: maxX + gap/2, labelY: change.position!.y + dragH/2 });
                 lines.push({ type: 'horizontal', pos: change.position!.y + dragH/2, start: n1LeftOfN2 ? n1.x + n1W : n2.x + n2W, end: n1LeftOfN2 ? n2.x : n1.x, label: `${Math.round(gap)}px`, labelX: (n1LeftOfN2 ? n1.x + n1W : n2.x + n2W) + gap/2, labelY: change.position!.y + dragH/2 });
                 break;
               }
            }
          }
          if (snappedToSpaceX) {
            snappedToX = true;
            break;
          }
        }
      }

      // Y-Axis Space Distribution
      if (!snappedToY) {
        let snappedToSpaceY = false;
        for (let i = 0; i < otherNodes.length; i++) {
          const n1 = state.visualData.layoutNodes[otherNodes[i].id];
          if (!n1) continue;
          const n1W = n1.width ?? 150;
          const n1H = n1.height ?? 48;
          
          if (!(change.position!.x < n1.x + n1W && change.position!.x + dragW > n1.x)) continue;

          for (let j = 0; j < otherNodes.length; j++) {
            if (i === j) continue;
            const n2 = state.visualData.layoutNodes[otherNodes[j].id];
            if (!n2) continue;
            const n2W = n2.width ?? 150;
            const n2H = n2.height ?? 48;

            if (!(n1.x < n2.x + n2W && n1.x + n1W > n2.x)) continue;

            let gap = 0;
            let n1TopOfN2 = true;
            if (n1.y + n1H < n2.y) {
               gap = n2.y - (n1.y + n1H);
               n1TopOfN2 = true;
            } else if (n2.y + n2H < n1.y) {
               gap = n1.y - (n2.y + n2H);
               n1TopOfN2 = false;
            } else {
               continue;
            }

            if (gap > 0 && gap < 500) {
               const minY = Math.min(n1.y, n2.y);
               const maxY = Math.max(n1.y + n1H, n2.y + n2H);
               
               const snapTop = minY - gap - dragH;
               const snapBottom = maxY + gap;

               if (Math.abs(change.position!.y - snapTop) < threshold) {
                 snappedY = snapTop;
                 snappedToSpaceY = true;
                 lines.push({ type: 'vertical', pos: change.position!.x + dragW/2, start: snapTop + dragH, end: minY, label: `${Math.round(gap)}px`, labelX: change.position!.x + dragW/2, labelY: snapTop + dragH + gap/2 });
                 lines.push({ type: 'vertical', pos: change.position!.x + dragW/2, start: n1TopOfN2 ? n1.y + n1H : n2.y + n2H, end: n1TopOfN2 ? n2.y : n1.y, label: `${Math.round(gap)}px`, labelX: change.position!.x + dragW/2, labelY: (n1TopOfN2 ? n1.y + n1H : n2.y + n2H) + gap/2 });
                 break;
               } else if (Math.abs(change.position!.y - snapBottom) < threshold) {
                 snappedY = snapBottom;
                 snappedToSpaceY = true;
                 lines.push({ type: 'vertical', pos: change.position!.x + dragW/2, start: maxY, end: snapBottom, label: `${Math.round(gap)}px`, labelX: change.position!.x + dragW/2, labelY: maxY + gap/2 });
                 lines.push({ type: 'vertical', pos: change.position!.x + dragW/2, start: n1TopOfN2 ? n1.y + n1H : n2.y + n2H, end: n1TopOfN2 ? n2.y : n1.y, label: `${Math.round(gap)}px`, labelX: change.position!.x + dragW/2, labelY: (n1TopOfN2 ? n1.y + n1H : n2.y + n2H) + gap/2 });
                 break;
               }
            }
          }
          if (snappedToSpaceY) {
            snappedToY = true;
            break;
          }
        }
      }

      change.position!.x = snappedX;
      change.position!.y = snappedY;
      if (change.positionAbsolute) {
        change.positionAbsolute.x = snappedX;
        change.positionAbsolute.y = snappedY;
      }
      setAlignmentLines(lines);

    } else if (dimensionChanges.length === 1) {
      // Handle Resizing Snapping
      const change = dimensionChanges[0];
      const otherNodes = state.logicalData.nodes.filter((n) => n.id !== change.id);
      const vnDrag = state.visualData.layoutNodes[change.id] ?? { x: 0, y: 0 };
      
      let snappedW = change.dimensions!.width;
      let snappedH = change.dimensions!.height;
      const lines: AlignmentLine[] = [];
      let snappedToW = false;
      let snappedToH = false;

      // When resizing, we snap the width or height to match other nodes
      // and show alignment lines on the edges being dragged.
      otherNodes.forEach((n) => {
        const vn = state.visualData.layoutNodes[n.id];
        if (!vn) return;
        const otherW = vn.width ?? 150;
        const otherH = vn.height ?? 48;

        // Snap Width
        if (!snappedToW) {
          if (Math.abs(otherW - change.dimensions!.width) < threshold) {
            snappedW = otherW;
            snappedToW = true;
            // Draw a vertical line at the right edge
            lines.push({
              type: 'vertical',
              pos: vnDrag.x + otherW,
              start: Math.min(vn.y, vnDrag.y) - 20,
              end: Math.max(vn.y + otherH, vnDrag.y + snappedH) + 20,
              label: `${Math.round(otherW)}px`,
              labelX: vnDrag.x + otherW,
              labelY: vnDrag.y + snappedH / 2,
            });
          }
        }

        // Snap Height
        if (!snappedToH) {
          if (Math.abs(otherH - change.dimensions!.height) < threshold) {
            snappedH = otherH;
            snappedToH = true;
            // Draw a horizontal line at the bottom edge
            lines.push({
              type: 'horizontal',
              pos: vnDrag.y + otherH,
              start: Math.min(vn.x, vnDrag.x) - 20,
              end: Math.max(vn.x + otherW, vnDrag.x + snappedW) + 20,
              label: `${Math.round(otherH)}px`,
              labelX: vnDrag.x + snappedW / 2,
              labelY: vnDrag.y + otherH,
            });
          }
        }
      });

      change.dimensions!.width = snappedW;
      change.dimensions!.height = snappedH;
      setAlignmentLines(lines);

    } else if (!changes.some((c) => (c.type === 'position' && c.dragging) || (c.type === 'dimensions' && c.resizing))) {
      setAlignmentLines([]);
    }
  }, [isBypassingSnap]);

  return {
    alignmentLines,
    handleSnapping,
    clearAlignmentLines: useCallback(() => setAlignmentLines([]), []),
  };
};
