import { LogicalNode, VisualNode } from '../../../types';

/**
 * Calculates the canvas-absolute coordinates of any node by recursively traversing
 * its parent chain up to the root canvas and summing relative (x, y) coordinates.
 */
export function getNodeAbsolutePosition(
  nodeId: string,
  logicalNodes: LogicalNode[],
  layoutNodes: Record<string, VisualNode>
): { x: number; y: number } {
  const vn = layoutNodes[nodeId];
  const relX = vn?.x ?? 0;
  const relY = vn?.y ?? 0;

  const ln = logicalNodes.find((n) => n.id === nodeId);
  if (ln?.parentId) {
    const parentAbs = getNodeAbsolutePosition(ln.parentId, logicalNodes, layoutNodes);
    return {
      x: relX + parentAbs.x,
      y: relY + parentAbs.y,
    };
  }

  return { x: relX, y: relY };
}

/**
 * Returns the depth of a node in the section hierarchy.
 * Root nodes (no parentId) have depth 0.
 * A node inside a root section has depth 1.
 * A node inside a nested section has depth 2, etc.
 */
export function getNodeDepth(nodeId: string, logicalNodes: LogicalNode[]): number {
  let depth = 0;
  let current: string | undefined = nodeId;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current)) break; // cycle protection
    visited.add(current);

    const ln = logicalNodes.find((n) => n.id === current);
    if (!ln || !ln.parentId) break;

    depth++;
    current = ln.parentId;
  }

  return depth;
}

/**
 * Checks if potentialDescendantId is equal to or a descendant of ancestorId.
 * Used for cycle prevention (e.g. preventing a parent section from being moved inside its own child).
 */
export function isDescendantOf(
  potentialDescendantId: string,
  ancestorId: string,
  logicalNodes: LogicalNode[]
): boolean {
  if (potentialDescendantId === ancestorId) return true;

  let current: string | undefined = potentialDescendantId;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current)) return false;
    visited.add(current);

    const node = logicalNodes.find((n) => n.id === current);
    if (!node || !node.parentId) return false;

    if (node.parentId === ancestorId) return true;
    current = node.parentId;
  }

  return false;
}

/**
 * Finds the deepest section containing the given canvas-absolute point (x, y).
 * If point is inside multiple nested sections, the one with the highest depth is returned.
 * Excludes `excludeNodeId` and any of its descendants to prevent cycles.
 */
export function findDeepestContainingSection(
  point: { x: number; y: number },
  logicalNodes: LogicalNode[],
  layoutNodes: Record<string, VisualNode>,
  excludeNodeId?: string
): string | null {
  const sections = logicalNodes.filter((n) => n.type === 'section');
  let deepestSectionId: string | null = null;
  let maxDepth = -1;

  for (const sec of sections) {
    // Cannot drop inside itself or any of its descendants
    if (excludeNodeId && (sec.id === excludeNodeId || isDescendantOf(sec.id, excludeNodeId, logicalNodes))) {
      continue;
    }

    const secAbs = getNodeAbsolutePosition(sec.id, logicalNodes, layoutNodes);
    const sv = layoutNodes[sec.id];
    const sw = sv?.width ?? 400;
    const sh = sv?.height ?? 300;

    const isInside =
      point.x >= secAbs.x &&
      point.x <= secAbs.x + sw &&
      point.y >= secAbs.y &&
      point.y <= secAbs.y + sh;

    if (isInside) {
      const depth = getNodeDepth(sec.id, logicalNodes);
      if (depth > maxDepth) {
        maxDepth = depth;
        deepestSectionId = sec.id;
      }
    }
  }

  return deepestSectionId;
}
