import { Node } from '@xyflow/react';

// Helper to map a LogicalNode to a ReactFlow Node
export const toRfNode = (ln: any, vn: any): Node => {
  const isSection = ln.type === 'section';
  return {
    id: ln.id,
    type: isSection ? 'sectionNode' : 'customNode',
    position: { x: vn.x ?? 0, y: vn.y ?? 0 },
    data: { name: ln.name, type: ln.type },
    width: vn.width ?? (isSection ? 400 : 224),
    height: vn.height ?? (isSection ? 300 : 52),
    ...(ln.parentId ? { parentId: ln.parentId, extent: 'parent' as const } : {}),
    ...(vn.zIndex != null ? { zIndex: vn.zIndex } : isSection ? { zIndex: -1 } : {}),
    style: isSection ? { width: vn.width ?? 400, height: vn.height ?? 300 } : undefined,
  };
};
