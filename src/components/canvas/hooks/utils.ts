import { Node } from '@xyflow/react';

// Helper to map a LogicalNode to a ReactFlow Node.
// No rotation/swap logic here — stored width/height ARE the bounding box.
export const toRfNode = (ln: any, vn: any): Node => {
  const isSection = ln.type === 'section';
  const w = vn.width  ?? (isSection ? 400 : 224);
  const h = vn.height ?? (isSection ? 300 : 52);

  return {
    id: ln.id,
    type: isSection ? 'sectionNode' : 'customNode',
    position: { x: vn.x ?? 0, y: vn.y ?? 0 },
    data: { name: ln.name, type: ln.type },
    width: w,
    height: h,
    ...(ln.parentId ? { parentId: ln.parentId, extent: 'parent' as const } : {}),
    ...(vn.zIndex != null ? { zIndex: vn.zIndex } : isSection ? { zIndex: -1 } : {}),
    style: isSection ? { width: w, height: h } : undefined,
  };
};
