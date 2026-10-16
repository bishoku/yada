import type { Language } from '../../i18n/translations';
import type { LogicalDiagram, VisualDiagram } from '../../types';
import { experienceCopy } from '../../i18n/experienceCopy';

export function isDiagramEmpty(logical: LogicalDiagram, visual: VisualDiagram) {
  return !logical.nodes.length && !logical.edges.length && !logical.sequences.length && !logical.sequenceDiagram
    && !Object.keys(visual.layoutNodes).length && !Object.keys(visual.annotations ?? {}).length && !Object.keys(visual.freehandStrokes ?? {}).length;
}

/** A small real diagram, using the same schema and scheduler as authored documents. */
export function createStarterDiagram(language: Language): { logicalData: LogicalDiagram; visualData: VisualDiagram } {
  const copy = experienceCopy[language];
  return {
    logicalData: { schemaVersion: 2, nodes: [
      { id: 'starter-client', type: 'client', name: copy.client },
      { id: 'starter-api', type: 'server', name: copy.server },
      { id: 'starter-database', type: 'database', name: copy.database },
    ], edges: [
      { id: 'starter-request', sourceId: 'starter-client', targetId: 'starter-api', isAsync: false, protocol: 'HTTP', description: copy.request },
      { id: 'starter-query', sourceId: 'starter-api', targetId: 'starter-database', isAsync: false, protocol: 'SQL', description: copy.query },
    ], sequences: [
      { id: 'starter-step-1', edgeId: 'starter-request', stepNumber: 1, isAsync: false, isRoundTrip: true },
      { id: 'starter-step-2', edgeId: 'starter-query', stepNumber: 2, isAsync: false, isRoundTrip: true },
    ] },
    visualData: { canvas: { zoom: 1, pan: {x:0,y:0} }, layoutNodes: {
      'starter-client': { id: 'starter-client', x: 0, y: 80, theme: 'indigo' },
      'starter-api': { id: 'starter-api', x: 340, y: 80, theme: 'emerald' },
      'starter-database': { id: 'starter-database', x: 680, y: 80, theme: 'violet' },
    }, layoutEdges: {
      'starter-request': { id: 'starter-request', sourceHandle: 'right:50', targetHandle: 'left:50', arrowEnd: 'triangle' },
      'starter-query': { id: 'starter-query', sourceHandle: 'right:50', targetHandle: 'left:50', arrowEnd: 'triangle' },
    }, timelines: {
      'starter-step-1': { sequenceId: 'starter-step-1', duration: 1200, delay: 0, internalProcess: {text:copy.process,duration:300} },
      'starter-step-2': { sequenceId: 'starter-step-2', duration: 1000, delay: 0 },
    } },
  };
}
