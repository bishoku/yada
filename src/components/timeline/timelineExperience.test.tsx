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
for(const language of ['tr','en'] as const)it(`separates playback, inspection and timing in ${language}`,()=>{
  prepare(language);const markup=renderToStaticMarkup(<TimelinePanel />);const copy=editingCopy[language];
  expect(markup).toContain(copy.inspect);expect(markup).toContain(copy.timing);expect(markup).toContain(copy.playback);expect(markup).toContain(copy.duration);expect(markup).toContain(copy.seekStep);
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
