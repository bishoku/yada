import { describe, it, expect } from 'vitest';
import {
  injectPngMetadata,
  extractPngMetadata,
  injectSvgMetadata,
  extractSvgMetadata,
} from './imageMetadata';

describe('imageMetadata - PNG & SVG embedded scene data', () => {
  const sampleDiagramData = {
    logicalData: {
      schemaVersion: 2,
      nodes: [
        { id: 'client-1', type: 'client', name: 'Web Client' },
        { id: 'server-1', type: 'server', name: 'API Server' },
      ],
      edges: [
        { id: 'edge-1', sourceId: 'client-1', targetId: 'server-1', isAsync: false },
      ],
      sequences: [
        { id: 'seq-1', stepNumber: 1, edgeId: 'edge-1', isAsync: false },
      ],
    },
    visualData: {
      canvas: { zoom: 1.2, pan: { x: 100, y: 50 }, renderStyle: 'sketchy' },
      layoutNodes: {
        'client-1': { id: 'client-1', x: 50, y: 100 },
        'server-1': { id: 'server-1', x: 300, y: 100 },
      },
      layoutEdges: {
        'edge-1': { id: 'edge-1', color: '#6366f1' },
      },
      timelines: {},
      freehandStrokes: {
        'stroke-1': {
          id: 'stroke-1',
          tool: 'pen',
          points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
          color: '#f59e0b',
          size: 4,
          opacity: 1,
        },
      },
    },
  };

  it('correctly embeds and extracts metadata from SVG XML string', () => {
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100" height="100" fill="red"/></svg>`;
    const enrichedSvg = injectSvgMetadata(rawSvg, sampleDiagramData);

    expect(enrichedSvg).toContain('<metadata id="yada-scene-data">');

    const extracted = extractSvgMetadata(enrichedSvg) as typeof sampleDiagramData;
    expect(extracted).not.toBeNull();
    expect(extracted.logicalData.nodes.length).toBe(2);
    expect(extracted.logicalData.nodes[0].name).toBe('Web Client');
    expect(extracted.visualData.canvas.renderStyle).toBe('sketchy');
    expect(extracted.visualData.freehandStrokes?.['stroke-1']?.color).toBe('#f59e0b');
  });

  it('returns null when extracting metadata from clean SVG with no metadata', () => {
    const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"></svg>`;
    const extracted = extractSvgMetadata(cleanSvg);
    expect(extracted).toBeNull();
  });

  it('correctly embeds and extracts metadata from PNG buffer', () => {
    // Minimal valid 1x1 PNG binary buffer
    // PNG signature + IHDR + IDAT + IEND
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const binary = atob(base64Png);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const enrichedBytes = injectPngMetadata(bytes.buffer, sampleDiagramData);
    const extracted = extractPngMetadata(enrichedBytes.buffer) as typeof sampleDiagramData;

    expect(extracted).not.toBeNull();
    expect(extracted.logicalData.nodes.length).toBe(2);
    expect(extracted.logicalData.nodes[1].name).toBe('API Server');
    expect(extracted.visualData.freehandStrokes?.['stroke-1']?.size).toBe(4);
  });
});
