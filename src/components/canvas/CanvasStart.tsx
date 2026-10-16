import { Boxes } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useExperienceCopy } from '../../i18n/useExperienceCopy';
import { isDiagramEmpty } from '../../features/onboarding/starterDiagram';
import { insertStarterDiagram } from '../../features/onboarding/insertStarterDiagram';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

export function CanvasStart({ onExample }: { onExample: () => void }) {
  const copy=useExperienceCopy();
  const visible=useAppStore(state => !!state.activeDiagramId && !!state.currentWorkspace && !state.currentWorkspace.path.startsWith('memory://') && !state.isReadOnly && !state.isCollabActive && !state.pendingDrop && !state.activeDrawingTool && isDiagramEmpty(state.logicalData,state.visualData));
  if (!visible) return null;
  return <div className="yada-canvas-start export-exclude">
    <EmptyState title={copy.canvasTitle} description={copy.canvasDescription}>
      <Button onClick={() => window.dispatchEvent(new Event('canvas:openLibrary'))}><Boxes size={18} aria-hidden="true" />{copy.addComponent}</Button>
      <Button variant="secondary" onClick={() => { if (insertStarterDiagram()) onExample(); }}>{copy.useExample}</Button>
    </EmptyState>
    <ol className="yada-first-steps">
      {[
        {title:copy.stepComponents,description:copy.stepComponentsHint},
        {title:copy.stepConnect,description:copy.stepConnectHint},
        {title:copy.stepPlay,description:copy.stepPlayHint},
      ].map((step,index) => <li key={step.title}><span className="yada-step-number" aria-hidden="true">{index+1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}
    </ol>
  </div>;
}
