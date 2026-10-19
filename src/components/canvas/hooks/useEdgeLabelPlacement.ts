import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';
import { pointAtProgress, sampleCubicPath } from './pathSampling';
import { placeEdgeLabel, type Bounds, type Point } from '../utils/edgePresentation';

export function useEdgeLabelPlacement(pathRef: RefObject<SVGPathElement | null>, path: string, fallback: Point, percent: number, text: string, source: string, target: string) {
  const labelRef = useRef<HTMLDivElement>(null);
  const { getInternalNode } = useReactFlow();
  const [position, setPosition] = useState(fallback);
  useLayoutEffect(() => {
    const element = pathRef.current, label = labelRef.current;
    if (!element || !label) return;
    const samples = sampleCubicPath(path);
    const update = () => {
      try {
        let anchor: Point, tangent: Point;
        if (samples?.length) {
          const nearest = percent === 50 ? samples.reduce((best, point) =>
            Math.hypot(point.x - fallback.x, point.y - fallback.y) < Math.hypot(best.x - fallback.x, best.y - fallback.y) ? point : best) :
            pointAtProgress(samples, Math.min(100, Math.max(0, percent)) / 100);
          anchor = percent === 50 ? fallback : nearest;
          tangent = { x: Math.cos(nearest.angle * Math.PI / 180), y: Math.sin(nearest.angle * Math.PI / 180) };
        } else {
          const length = element.getTotalLength();
          let distance = length * Math.min(100, Math.max(0, percent)) / 100;
          if (percent === 50) {
            // Multi-segment routing can choose the longest segment instead of half the arc.
            let nearest = Infinity;
            for (let i = 0; i <= 24; i++) {
              const point = element.getPointAtLength(length * i / 24);
              const squared = (point.x - fallback.x) ** 2 + (point.y - fallback.y) ** 2;
              if (squared < nearest) { nearest = squared; distance = length * i / 24; }
            }
          }
          anchor = percent === 50 ? fallback : element.getPointAtLength(distance);
          const before = element.getPointAtLength(Math.max(0, distance - 1));
          const after = element.getPointAtLength(Math.min(length, distance + 1));
          tangent = { x: after.x - before.x, y: after.y - before.y };
        }
        const nodes: Bounds[] = [];
        for (const id of new Set([source, target])) {
          const node = getInternalNode(id);
          if (node) nodes.push({ ...node.internals.positionAbsolute, width: node.measured.width ?? node.width ?? 0, height: node.measured.height ?? node.height ?? 0 });
        }
        const next = placeEdgeLabel(anchor, tangent, { width: label.offsetWidth, height: label.offsetHeight }, nodes);
        setPosition(previous => previous.x === next.x && previous.y === next.y ? previous : next);
      } catch { /* SVG geometry is not available until the path is mounted. */ }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(label);
    return () => observer.disconnect();
  }, [path, fallback.x, fallback.y, percent, text, source, target, getInternalNode, pathRef]);
  return { labelRef, labelX: position.x, labelY: position.y };
}
