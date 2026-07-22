import { LogicalDiagram, VisualDiagram, SequenceStep, TimelineTiming } from '../types';

/**
 * Migrate Logical and Visual data from Schema V1 (or unversioned) to Schema V2.
 * 
 * V1 -> V2 changes:
 * 1. Move simulation animation fields (`animationMode`, `repeatParticleCount`) from `LogicalDiagram.sequences`
 *    to `VisualDiagram.timelines[sequenceId]`.
 * 2. Purge pseudo-logical sticky notes (`type === 'sticky_note'` or `properties._visualOnly === true`) from `LogicalDiagram.nodes`.
 *    Sticky notes exist strictly in `VisualDiagram.annotations` and `VisualDiagram.layoutNodes`.
 * 3. Update `schemaVersion` to 2.
 */
export function migrateToSchemaV2(
  logicalData: LogicalDiagram,
  visualData: VisualDiagram
): { logicalData: LogicalDiagram; visualData: VisualDiagram } {
  // Current schema version check
  const currentVersion = logicalData?.schemaVersion ?? 1;
  if (currentVersion >= 2) {
    return { logicalData, visualData };
  }

  // Deep clone or shallow copy structures we modify
  const rawSequences = logicalData.sequences ?? [];
  const rawNodes = logicalData.nodes ?? [];
  const timelines: Record<string, TimelineTiming> = { ...(visualData.timelines ?? {}) };

  // 1. Migrate Sequence animation properties to VisualDiagram.timelines
  const migratedSequences: SequenceStep[] = rawSequences.map((seq: any) => {
    const { animationMode, repeatParticleCount, ...cleanSeq } = seq;

    if (animationMode !== undefined || repeatParticleCount !== undefined) {
      const existingTiming = timelines[seq.id] || {
        sequenceId: seq.id,
        duration: 1000,
        delay: 0,
      };

      timelines[seq.id] = {
        ...existingTiming,
        sequenceId: seq.id,
        ...(animationMode !== undefined ? { animationMode } : {}),
        ...(repeatParticleCount !== undefined ? { repeatParticleCount } : {}),
      };
    }

    return cleanSeq as SequenceStep;
  });

  // 2. Remove Sticky Notes from LogicalDiagram.nodes
  const migratedNodes = rawNodes.filter((node: any) => {
    const isStickyNote = node.type === 'sticky_note' || node.properties?._visualOnly === true;
    return !isStickyNote;
  });

  const migratedLogical: LogicalDiagram = {
    ...logicalData,
    schemaVersion: 2,
    nodes: migratedNodes,
    sequences: migratedSequences,
  };

  const migratedVisual: VisualDiagram = {
    ...visualData,
    timelines,
  };

  return {
    logicalData: migratedLogical,
    visualData: migratedVisual,
  };
}
