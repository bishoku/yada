import { afterEach, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Position, ReactFlowProvider, type EdgeProps } from '@xyflow/react';
import { AnimatedEdge } from './AnimatedEdge';
import { useAppStore } from '../../store/useAppStore';
import { createStarterDiagram } from '../../features/onboarding/starterDiagram';
const initial = useAppStore.getInitialState(), original = { ...initial };
afterEach(() => Object.assign(initial, original));
function render(style: 'clean' | 'sketchy', selected = false) {
  const doc = createStarterDiagram('en');
  doc.visualData.canvas.renderStyle = style;
  doc.visualData.layoutEdges['starter-request'].arrowStart = 'open';
  Object.assign(initial, doc, { isPlaying: false, isReadOnly: false });
  const props = { id: 'starter-request', source: 'starter-client', target: 'starter-api', sourceX: 100, sourceY: 100, targetX: 250, targetY: 300, sourcePosition: Position.Bottom, targetPosition: Position.Top, selected } as EdgeProps;
  return renderToStaticMarkup(<ReactFlowProvider><svg><AnimatedEdge {...props} /></svg></ReactFlowProvider>);
}
it.each(['clean', 'sketchy'] as const)('renders one arrow per endpoint on the exact route in %s style', style => {
  const markup = render(style);
  expect(markup.match(/markerUnits="userSpaceOnUse"/g)).toHaveLength(2);
  expect(markup.match(/marker-start=/g)).toHaveLength(1);
  expect(markup.match(/marker-end=/g)).toHaveLength(1);
  expect(markup).toMatch(/data-edge-arrow-layer="true" d="M100,100 C/);
  expect(markup).toMatch(/data-edge-arrow-layer="true"[^>]*stroke="none"[^>]*marker-start=/);
  expect(markup).toMatch(/class="react-flow__edge-path[^>]*stroke-width:2/);
});
it('keeps marker size stable on selection and separates small visuals from hit targets', () => {
  const markup = render('clean', true);
  expect(markup.match(/markerWidth="12.5"/g)).toHaveLength(2);
  expect(markup).toContain('yada-edge-endpoints export-exclude');
  expect(markup.match(/r="3.5"/g)).toHaveLength(2);
  expect(markup).toContain('stroke-width:2.75');
  expect(markup).toContain('stroke-width="16"');
});
