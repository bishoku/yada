import type { Edge, Viewport } from '@xyflow/react';
import { HEADER_HEIGHT, MESSAGE_ROW_HEIGHT, TOP_PADDING } from './sequenceLayoutUtils';
import type { SeqMessageData } from './useSequenceLayout';

/** Screen-pixel overscan includes message labels and avoids popping at viewport edges. */
export const SEQUENCE_OVERSCAN = 120;
export function visibleSequenceEdges(edges: Edge[], viewport: Viewport, height: number, full = false): Edge[] {
  if (full || height <= 0 || !Number.isFinite(height) || !Number.isFinite(viewport.y) || !Number.isFinite(viewport.zoom) || viewport.zoom <= 0) return edges;
  return edges.filter(edge => {
    const slot = (edge.data as unknown as SeqMessageData)?.slotIndex;
    // Unknown geometry must remain visible rather than losing legacy/custom messages.
    if (!Number.isFinite(slot)) return true;
    const screenY = viewport.y + (TOP_PADDING + HEADER_HEIGHT + (slot + 0.5) * MESSAGE_ROW_HEIGHT) * viewport.zoom;
    return screenY >= -SEQUENCE_OVERSCAN && screenY <= height + SEQUENCE_OVERSCAN;
  });
}
