import { LogicalDiagram, VisualDiagram } from '../types';

export interface ImportFilter {
  types?: string[]; // e.g., ['http', 'sql']
}

export interface DiagramAdapter {
  id: string;
  name: string;
  description: string;
  supportedFormats: string[]; // e.g., ['.json']
  parse: (rawInput: string, filters?: ImportFilter) => Promise<{ logicalData: LogicalDiagram; visualData: VisualDiagram }>;
}
