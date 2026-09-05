import { useState, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';

interface Point {
  x: number;
  y: number;
}

export function useWaypointInteraction(edgeId: string, storeWaypoints: Point[] | undefined) {
  const updateEdgeWaypoints = useAppStore((s) => s.updateEdgeWaypoints);
  const reactFlow = useReactFlow();

  const [localWaypoints, setLocalWaypoints] = useState<Point[] | null>(null);
  const isDragging = useRef(false);
  const dragInfo = useRef<{ index: number; startPos: Point; initialWp: Point } | null>(null);

  useEffect(() => {
    if (!isDragging.current) {
      setLocalWaypoints(storeWaypoints || null);
    }
  }, [storeWaypoints]);

  const activeWaypoints = localWaypoints ?? storeWaypoints ?? [];

  const handlePointerDown = (e: React.PointerEvent, index: number, isGhost: boolean, ghostPoint?: Point) => {
    e.stopPropagation();
    isDragging.current = true;

    let currentWaypoints = [...activeWaypoints];

    if (isGhost && ghostPoint) {
      // Insert the new waypoint at the segment index
      currentWaypoints.splice(index, 0, ghostPoint);
      // The newly inserted point is now at `index`
    }

    setLocalWaypoints(currentWaypoints);

    dragInfo.current = {
      index,
      startPos: { x: e.clientX, y: e.clientY },
      initialWp: { ...currentWaypoints[index] },
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!dragInfo.current) return;
      const { index, startPos, initialWp } = dragInfo.current;
      
      const zoom = reactFlow.getZoom();
      const dx = (moveEvt.clientX - startPos.x) / zoom;
      const dy = (moveEvt.clientY - startPos.y) / zoom;

      setLocalWaypoints((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[index] = {
          x: initialWp.x + dx,
          y: initialWp.y + dy,
        };
        return next;
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      isDragging.current = false;
      dragInfo.current = null;
      
      // Update global store
      setLocalWaypoints((current) => {
        if (current) {
          updateEdgeWaypoints(edgeId, current.length > 0 ? current : undefined);
        }
        return current;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleSegmentPointerDown = (
    e: React.PointerEvent,
    p1Index: number,
    p2Index: number,
    isVertical: boolean,
    sourcePoint: Point,
    targetPoint: Point
  ) => {
    e.stopPropagation();
    isDragging.current = true;

    let currentWaypoints = [...activeWaypoints];

    // If dragging segment between source and target with NO waypoints yet:
    if (currentWaypoints.length === 0) {
      if (isVertical) {
        const midX = Math.round((sourcePoint.x + targetPoint.x) / 2);
        currentWaypoints = [
          { x: midX, y: sourcePoint.y },
          { x: midX, y: targetPoint.y }
        ];
        p1Index = 0;
        p2Index = 1;
      } else {
        const midY = Math.round((sourcePoint.y + targetPoint.y) / 2);
        currentWaypoints = [
          { x: sourcePoint.x, y: midY },
          { x: targetPoint.x, y: midY }
        ];
        p1Index = 0;
        p2Index = 1;
      }
      setLocalWaypoints(currentWaypoints);
    }

    const initialWps = currentWaypoints.map(w => ({ ...w }));
    const startPos = { x: e.clientX, y: e.clientY };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const zoom = reactFlow.getZoom();
      const dx = (moveEvt.clientX - startPos.x) / zoom;
      const dy = (moveEvt.clientY - startPos.y) / zoom;

      setLocalWaypoints((prev) => {
        if (!prev) return prev;
        const next = [...prev];

        if (isVertical) {
          if (p1Index >= 0 && p1Index < next.length) {
            next[p1Index] = { ...next[p1Index], x: Math.round(initialWps[p1Index].x + dx) };
          }
          if (p2Index >= 0 && p2Index < next.length) {
            next[p2Index] = { ...next[p2Index], x: Math.round(initialWps[p2Index].x + dx) };
          }
        } else {
          if (p1Index >= 0 && p1Index < next.length) {
            next[p1Index] = { ...next[p1Index], y: Math.round(initialWps[p1Index].y + dy) };
          }
          if (p2Index >= 0 && p2Index < next.length) {
            next[p2Index] = { ...next[p2Index], y: Math.round(initialWps[p2Index].y + dy) };
          }
        }
        return next;
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      isDragging.current = false;

      setLocalWaypoints((current) => {
        if (current) {
          updateEdgeWaypoints(edgeId, current.length > 0 ? current : undefined);
        }
        return current;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleDoubleClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newWaypoints = [...activeWaypoints];
    newWaypoints.splice(index, 1); // Remove the waypoint
    setLocalWaypoints(newWaypoints);
    updateEdgeWaypoints(edgeId, newWaypoints.length > 0 ? newWaypoints : undefined);
  };

  return {
    activeWaypoints,
    handlePointerDown,
    handleDoubleClick,
    handleSegmentPointerDown,
  };
}
