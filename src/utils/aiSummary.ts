import { message } from '../i18n/messages';
import { LogicalDiagram, VisualDiagram, CustomComponentTemplate } from '../types';

/**
 * Generates an LLM-friendly, structured textual summary of a diagram's components,
 * connections, metadata, and sequence interaction flows.
 */
export function generateDiagramAiSummary(
  logicalData: LogicalDiagram | any,
  visualData?: VisualDiagram | any,
  language: 'tr' | 'en' = 'tr',
  libraryComponents: CustomComponentTemplate[] = []
): string {
  if (!logicalData) return '';

  const nodes = Array.isArray(logicalData.nodes) ? logicalData.nodes : [];
  const edges = Array.isArray(logicalData.edges) ? logicalData.edges : [];
  const sequences = Array.isArray(logicalData.sequences) ? logicalData.sequences : [];

  let text = `${message(language, "aiSummary.analyzeAndExplainTheFollowingSystemArchitecture")}\n\n`;

  text += `**${message(language, "aiSummary.components")}:**\n`;
  if (nodes.length === 0) {
    text += message(language, "aiSummary.noComponentsDefined");
  } else {
    nodes.forEach((node: any) => {
      const customTemplate = libraryComponents.find((c: any) => c.componentId === node.type);
      const category = customTemplate ? customTemplate.category : (node.type || 'Generic');
      text += `- \`${node.name || node.id}\` (Type: ${category})\n`;
      if (node.properties && Object.keys(node.properties).length > 0) {
        text += `  - Metadata: ${JSON.stringify(node.properties)}\n`;
      }
    });
  }

  if (edges.length > 0) {
    text += `\n**${message(language, "aiSummary.connections")}:**\n`;
    edges.forEach((edge: any) => {
      const sourceNode = nodes.find((n: any) => n.id === edge.sourceId);
      const targetNode = nodes.find((n: any) => n.id === edge.targetId);
      const sourceName = sourceNode ? sourceNode.name : edge.sourceId;
      const targetName = targetNode ? targetNode.name : edge.targetId;

      text += `- \`${sourceName}\` → \`${targetName}\` (Protocol: ${edge.protocol || 'Call'})\n`;
      if (edge.description) {
        text += `  - Description: ${edge.description}\n`;
      }
      if (edge.properties && Object.keys(edge.properties).length > 0) {
        text += `  - Metadata: ${JSON.stringify(edge.properties)}\n`;
      }
    });
  }

  if (sequences.length > 0) {
    text += `\n**${message(language, "aiSummary.interactionFlow")}:**\n`;

    const sortedSeqs = [...sequences].sort((a: any, b: any) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0));

    sortedSeqs.forEach((seq: any) => {
      const edge = edges.find((e: any) => e.id === seq.edgeId);
      if (!edge) return;

      const sourceNode = nodes.find((n: any) => n.id === edge.sourceId);
      const targetNode = nodes.find((n: any) => n.id === edge.targetId);
      const sourceName = sourceNode ? sourceNode.name : edge.sourceId;
      const targetName = targetNode ? targetNode.name : edge.targetId;

      const syncType = seq.isAsync
        ? (message(language, "aiSummary.asynchronous"))
        : (message(language, "aiSummary.synchronous"));
      const directionStr = `\`${sourceName}\` → \`${targetName}\`` + (seq.isRoundTrip ? ' ↔' : '');

      text += `${seq.stepNumber}. [${syncType}] ${directionStr} (Protocol: ${edge.protocol || 'Call'})\n`;

      if (edge.description) {
        text += `   - Description: ${edge.description}\n`;
      }

      const timing = visualData?.timelines?.[seq.id];
      if (timing?.internalProcess?.text) {
        text += `   - Node \`${targetName}\` internal process: "${timing.internalProcess.text}"\n`;
      }
    });
  }

  return text.trimEnd();
}
