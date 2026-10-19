import { afterEach, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TimelinePanel } from '../layout/TimelinePanel';
import { useAppStore } from '../../store/useAppStore';
import { createStarterDiagram } from '../../features/onboarding/starterDiagram';
import { calculateSchedules } from '../../store/scheduler';
import { editingCopy } from '../../i18n/editingCopy';
const initial=useAppStore.getInitialState();const original={...initial};
afterEach(()=>Object.assign(initial,original));
function prepare(language:'tr'|'en'){
  const doc=createStarterDiagram(language);
  Object.assign(initial,{...doc,language,isPlaying:false,isReadOnly:false,selectedSequenceId:'starter-step-1',schedules:calculateSchedules(doc.logicalData.sequences,doc.visualData.timelines,doc.logicalData.edges),timelineOpen:true});
}
for(const language of ['tr','en'] as const)it(`keeps everyday playback separate from optional timing controls in ${language}`,()=>{
  prepare(language);const markup=renderToStaticMarkup(<TimelinePanel />);const copy=editingCopy[language];
  expect(markup).toContain(copy.tuningHelp);expect(markup).toContain(copy.timing);expect(markup).toContain(copy.playback);expect(markup).toContain(copy.shortDuration);expect(markup).toContain(copy.seekStep);
  expect(markup).not.toContain(`>${copy.inspectHint}<`);expect(markup).not.toContain(copy.inspect);
  expect(markup).not.toContain('<option value="30">'); // Preview has no accidental order editing.
});
it('keeps read-only timing inspection available without mutation controls',()=>{
  prepare('en');initial.isReadOnly=true;const markup=renderToStaticMarkup(<TimelinePanel />);
  expect(markup).toContain(editingCopy.en.details);expect(markup).not.toContain(editingCopy.en.timing);expect(markup).not.toContain('<option value="30">');
});
it('does not mount timing rows or mode controls in the collapsed panel',()=>{
  prepare('tr');const markup=renderToStaticMarkup(<TimelinePanel forceCollapsed />);
  expect(markup).not.toContain(editingCopy.tr.inspect);expect(markup).not.toContain('starter-step-1');
});

it('does not reserve a playback row for an empty closed canvas',()=>{
  prepare('en');initial.logicalData={schemaVersion:2,nodes:[],edges:[],sequences:[]};initial.timelineOpen=false;
  expect(renderToStaticMarkup(<TimelinePanel />)).toBe('');
});
it('keeps tuning closed by default and mounts only the everyday playback dock',()=>{
  prepare('en');initial.timelineOpen=false;
  const markup=renderToStaticMarkup(<TimelinePanel />);
  expect(markup).toContain('data-playback-dock');expect(markup).not.toContain('data-timeline-editor');
  expect(markup).not.toContain('starter-step-1');expect(markup).toContain(editingCopy.en.openTuning);
  expect(markup.match(/<select/g)).toHaveLength(1);
});
for (const language of ['tr', 'en'] as const) it(`offers direct localized timing fields without a modal in ${language}`, () => {
  prepare(language);
  const markup = renderToStaticMarkup(<TimelinePanel />), copy = editingCopy[language];
  expect(markup).toContain(`aria-label="${copy.duration}"`);
  expect(markup).toContain(`aria-label="${copy.delay}"`);
  expect(markup.match(/inputMode="decimal"/g)).toHaveLength(2);
  expect(markup).not.toContain('role="dialog"');
  expect(markup).toContain(copy.inlineTimingHint);
});
it('disables quick timing fields during playback and omits them for read-only documents', () => {
  prepare('en'); initial.isPlaying = true;
  let markup = renderToStaticMarkup(<TimelinePanel />);
  expect(markup.match(/disabled="" value="(?:1200|0)"/g)).toHaveLength(2);
  initial.isReadOnly = true;
  markup = renderToStaticMarkup(<TimelinePanel />);
  expect(markup).not.toContain('inputMode="decimal"');
});
