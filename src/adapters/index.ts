import type { DiagramAdapter } from './types';
import { tempoMetadata, mermaidMetadata } from './metadata';

// Listing import formats must not load parsers or the graph layout engine.
export const availableAdapters: DiagramAdapter[] = [
  {
    ...tempoMetadata,
    parse: async (...args) => (await import('./tempoAdapter')).tempoAdapter.parse(...args),
    extractMetadata: async raw => (await import('./tempoAdapter')).tempoAdapter.extractMetadata!(raw),
  },
  {
    ...mermaidMetadata,
    parse: async (...args) => (await import('./mermaidAdapter')).mermaidAdapter.parse(...args),
  },
];
