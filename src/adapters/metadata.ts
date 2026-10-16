import type { DiagramAdapter } from './types';
type AdapterMetadata = Omit<DiagramAdapter, 'parse' | 'extractMetadata'>;
export const tempoMetadata: AdapterMetadata = {
  id: 'tempo-otlp', name: 'Grafana Tempo (OTLP)',
  description: 'Import OpenTelemetry JSON trace exports from Grafana Tempo.',
  supportedFormats: ['.json'], importMethod: 'text-modal',
};
export const mermaidMetadata: AdapterMetadata = {
  id: 'mermaid-sequence', name: 'Mermaid Sequence Diagram',
  description: 'Import Mermaid sequence messages, participants, notes, activations and nested blocks',
  supportedFormats: ['.mmd', '.mermaid', '.txt'], importMethod: 'text-modal',
};
