import { describe, expect, it } from 'vitest';
import { generateStandaloneHtml } from './exportTemplate';
import { generateSequenceHtml } from './exportSequenceTemplate';
import type { LogicalDiagram, VisualDiagram } from '../types';

const logical: LogicalDiagram = { schemaVersion: 2, nodes: [{ id: 'api', type: 'server', name: 'User supplied API' }], edges: [], sequences: [] };
const visual: VisualDiagram = { canvas: { zoom: 1, pan: { x: 0, y: 0 } }, layoutNodes: {}, layoutEdges: {}, timelines: {} };

describe('standalone player language', () => {
  for (const language of ['tr', 'en'] as const) {
    it(`localizes both players in ${language} without changing document content`, () => {
      const before = JSON.stringify({ logical, visual });
      const pages = [generateStandaloneHtml(logical, visual, [], language), generateSequenceHtml(logical, {}, {}, 'light', language)];
      for (const html of pages) {
        expect(html).toContain(`<html lang="${language}"`);
        expect(html).toContain(language === 'tr' ? 'aria-label="Oynatma konumu"' : 'aria-label="Playback position"');
        expect(html).toContain(language === 'tr' ? 'aria-label="Yakınlaştır"' : 'aria-label="Zoom in"');
        expect(html).toContain('User supplied API');
        expect(html).not.toContain('fonts.googleapis.com');
        expect(html).not.toContain('fonts.gstatic.com');
        expect(html).toContain('data:font/woff2;base64,');
        const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
        expect(script).toBeTruthy();
        // Parse generated JavaScript without running browser or document code.
        expect(() => new Function(script!)).not.toThrow();
      }
      expect(JSON.stringify({ logical, visual })).toBe(before);
    });
  }
});
