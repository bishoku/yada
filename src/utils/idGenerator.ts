import { useAppStore } from '../store/useAppStore';

export function generateNodeId(type: string): string {
  const existingIds = new Set(useAppStore.getState().logicalData.nodes.map(n => n.id));
  const cleanType = type.toLowerCase().replace(/[^a-z0-9]/g, '');
  let counter = 1;
  let newId = `n-${cleanType}-${counter}`;
  while (existingIds.has(newId)) {
    counter++;
    newId = `n-${cleanType}-${counter}`;
  }
  return newId;
}

export function generateEdgeId(sourceId: string, targetId: string): string {
  const existingIds = new Set(useAppStore.getState().logicalData.edges.map(e => e.id));
  const srcPart = sourceId.replace(/^n-/, '');
  const tgtPart = targetId.replace(/^n-/, '');
  
  let newId = `e-${srcPart}-${tgtPart}`;
  if (existingIds.has(newId)) {
    let counter = 1;
    newId = `e-${srcPart}-${tgtPart}-${counter}`;
    while (existingIds.has(newId)) {
      counter++;
      newId = `e-${srcPart}-${tgtPart}-${counter}`;
    }
  }
  return newId;
}

export function generateSeqId(): string {
  const existingIds = new Set(useAppStore.getState().logicalData.sequences.map(s => s.id));
  let counter = 1;
  let newId = `seq-${counter}`;
  while (existingIds.has(newId)) {
    counter++;
    newId = `seq-${counter}`;
  }
  return newId;
}
