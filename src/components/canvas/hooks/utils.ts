import { Node } from '@xyflow/react';

// Helper to map a LogicalNode to a ReactFlow Node.
// No rotation/swap logic here — stored width/height ARE the bounding box.
export const toRfNode = (ln: any, vn: any, allNodes?: any[]): Node => {
  const isSection = ln.type === 'section';
  const isStickyNote = ln.type === 'sticky_note';
  const isFreeForm = ln.type === 'freeform';
  const w = vn.width  ?? (isSection ? 400 : isStickyNote ? 220 : isFreeForm ? 320 : 224);
  const h = vn.height ?? (isSection ? 300 : isStickyNote ? 160 : isFreeForm ? 220 : 52);

  let sectionZIndex = -100;
  if (isSection) {
    let depth = 0;
    let current = ln.parentId;
    const visited = new Set<string>();
    while (current && allNodes && !visited.has(current)) {
      visited.add(current);
      depth++;
      const parentNode = allNodes.find((n: any) => n.id === current);
      current = parentNode?.parentId;
    }
    sectionZIndex = -100 + depth * 5;
  }

  const rfType = isSection ? 'sectionNode' : isStickyNote ? 'stickyNoteNode' : isFreeForm ? 'freeFormNode' : 'customNode';
  const nodeZIndex = vn.zIndex != null ? vn.zIndex : isSection ? sectionZIndex : isStickyNote ? 20 : 1;

  return {
    id: ln.id,
    type: rfType,
    position: { x: vn.x ?? 0, y: vn.y ?? 0 },
    data: { name: ln.name, type: ln.type },
    width: w,
    height: h,
    ...(ln.parentId ? { parentId: ln.parentId } : {}),
    zIndex: nodeZIndex,
    style: isSection || isStickyNote || isFreeForm ? { width: w, height: h } : undefined,
  };
};
