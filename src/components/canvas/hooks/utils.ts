import { Node } from '@xyflow/react';

// Helper to map a LogicalNode to a ReactFlow Node.
// No rotation/swap logic here — stored width/height ARE the bounding box.
export const toRfNode = (ln: any, vn: any, allNodes?: any[]): Node => {
  const isSection = ln.type === 'section';
  const isStickyNote = ln.type === 'sticky_note';
  const w = vn.width  ?? (isSection ? 400 : isStickyNote ? 220 : 224);
  const h = vn.height ?? (isSection ? 300 : isStickyNote ? 160 : 52);

  let sectionZIndex = -1;
  if (isSection) {
    let depth = 0;
    let current = ln.parentId;
    while (current && allNodes) {
      depth++;
      const parentNode = allNodes.find((n: any) => n.id === current);
      current = parentNode?.parentId;
    }
    sectionZIndex = -1 + depth;
  }

  return {
    id: ln.id,
    type: isSection ? 'sectionNode' : isStickyNote ? 'stickyNoteNode' : 'customNode',
    position: { x: vn.x ?? 0, y: vn.y ?? 0 },
    data: { name: ln.name, type: ln.type },
    width: w,
    height: h,
    ...(ln.parentId ? { parentId: ln.parentId } : {}),
    ...(vn.zIndex != null ? { zIndex: vn.zIndex } : isSection ? { zIndex: sectionZIndex } : {}),
    style: isSection || isStickyNote ? { width: w, height: h } : undefined,
  };
};
