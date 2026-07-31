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
  };
}
