import { describe, expect, it } from 'vitest';
import { renderDiagramFrame, calculateSchedules } from './canvasRenderer';
import type { LogicalDiagram, VisualDiagram } from '../types';
const logical: LogicalDiagram = { schemaVersion: 2, nodes: [{ id: 'section', name: 'Group', type: 'section' }, { id: 'a', name: 'Client', type: 'client', parentId: 'section' }, { id: 'b', name: 'Server', type: 'server' }], edges: [{ id: 'e1', sourceId: 'a', targetId: 'b', isAsync: false }, { id: 'e2', sourceId: 'b', targetId: 'a', isAsync: true }], sequences: [{ id: 's1', edgeId: 'e1', stepNumber: 1, isAsync: false, isRoundTrip: true }, { id: 's2', edgeId: 'e2', stepNumber: 2, isAsync: true }] };
const visual: VisualDiagram = { canvas: { zoom: 1, pan: { x: 0, y: 0 }, gridVisible: false }, layoutNodes: { section: { id: 'section', x: 50, y: 60, width: 300, height: 200 }, a: { id: 'a', x: 20, y: 40 }, b: { id: 'b', x: 500, y: 80 } }, layoutEdges: {}, timelines: { s1: { sequenceId: 's1', duration: 1000, delay: 0, internalProcess: { text: 'Process', duration: 300 } }, s2: { sequenceId: 's2', duration: 400, delay: 50, internalProcess: { text: 'After arrival', duration: 200 } } } };
function trace(time: number) {
  const calls: unknown[] = [];
  const context = new Proxy({}, {
    get(_, name) {
      if (name === 'measureText') return (text: string) => ({ width: text.length * 6 });
      return (...args: unknown[]) => { calls.push([name, ...args]); };
    },
    set(_, name, value) { calls.push(['set', name, value]); return true; },
  }) as CanvasRenderingContext2D;
  renderDiagramFrame(context, { logicalData: logical, visualData: visual, schedules: calculateSchedules(logical, visual.timelines), currentTime: time, theme: 'light', libraryComponents: [], canvasWidth: 900, canvasHeight: 500 });
  let hash = 2166136261;
  for (const char of JSON.stringify(calls)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}
// Drawing-command fingerprints recorded from the pre-cache renderer at the same fixture times.
describe('canvas drawing backward compatibility', () => {
  it('retains legacy drawing commands at transit, process, return and idle frames', () => {
    expect([0, 250, 650, 1000, 1500, 3000].map(trace)).toMatchSnapshot();
  });
});
