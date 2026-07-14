import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ActiveEdgeProperties } from '../../../types';

export type EdgePropertiesFormRef = { submit: () => void };

interface EdgePropertiesFormProps {
  activeEdge: ActiveEdgeProperties;
  language: string;
  maxSteps: number;
  sequenceDirection: 'forward' | 'reverse';
  sequenceRoundTrip: boolean;
  onSubmit: (
    id: string, protocol: string, isAsync: boolean, duration: number, delay: number,
    tooltipText: string, tooltipDuration: number, description: string,
    particleType: 'circle' | 'arrow' | 'envelope' | undefined,
    stepNumber: number, direction: 'forward' | 'reverse', isRoundTrip: boolean
  ) => void;
}

/** Compact label */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
    {children}
  </span>
);

/** Compact text/number input */
const CompactInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 ${props.className ?? ''}`}
  />
);

/** Thin divider with optional inline label */
const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-2 pt-2 mt-0.5 border-t border-slate-100 dark:border-slate-800/70">
    {label && <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</span>}
    {label && <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/70" />}
  </div>
);

/**
 * EdgePropertiesForm
 * Compact, focused form for editing a single edge's properties.
 */
export const EdgePropertiesForm = forwardRef<EdgePropertiesFormRef, EdgePropertiesFormProps>(({
  activeEdge,
  language: lang,
  maxSteps,
  sequenceDirection,
  sequenceRoundTrip,
  onSubmit,
}, ref) => {
  const [protocol, setProtocol] = useState(activeEdge.protocol);
  const [isAsync, setIsAsync] = useState(activeEdge.isAsync);
  const [stepNumber, setStepNumber] = useState(activeEdge.stepNumber);
  const [duration, setDuration] = useState(activeEdge.duration);
  const [delay, setDelay] = useState(activeEdge.delay);
  const [tooltipText, setTooltipText] = useState(activeEdge.tooltipText);
  const [tooltipDuration, setTooltipDuration] = useState(activeEdge.tooltipDuration);
  const [formDirection, setFormDirection] = useState<'forward' | 'reverse'>(sequenceDirection);
  const [formRoundTrip, setFormRoundTrip] = useState(sequenceRoundTrip);
  const [description, setDescription] = useState(activeEdge.description ?? '');
  const [particleType, setParticleType] = useState<'circle' | 'arrow' | 'envelope'>(activeEdge.particleType ?? 'circle');

  useEffect(() => {
    setProtocol(activeEdge.protocol);
    setIsAsync(activeEdge.isAsync);
    setStepNumber(activeEdge.stepNumber);
    setDuration(activeEdge.duration);
    setDelay(activeEdge.delay);
    setTooltipText(activeEdge.tooltipText);
    setTooltipDuration(activeEdge.tooltipDuration);
    setDescription(activeEdge.description ?? '');
    setParticleType(activeEdge.particleType ?? 'circle');
    setFormDirection(sequenceDirection);
    setFormRoundTrip(sequenceRoundTrip);
  }, [activeEdge, sequenceDirection, sequenceRoundTrip]);

  useImperativeHandle(ref, () => ({
    submit: () => onSubmit(activeEdge.id, protocol, isAsync, duration, delay, tooltipText, tooltipDuration, description, particleType, stepNumber, formDirection, formRoundTrip),
  }), [activeEdge.id, protocol, isAsync, duration, delay, tooltipText, tooltipDuration, description, particleType, stepNumber, formDirection, formRoundTrip, onSubmit]);

  const tr = (t: string, e: string) => lang === 'tr' ? t : e;

  return (
    <div className="flex flex-col gap-2">

      {/* Protocol + Step — side by side */}
      <div className="grid grid-cols-[1fr_80px] gap-2">
        <div className="flex flex-col gap-1">
          <Label>{tr('Protokol', 'Protocol')}</Label>
          <CompactInput
            type="text"
            placeholder="HTTP, gRPC, WS..."
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>{tr('Adım', 'Step')}</Label>
          <select
            value={stepNumber}
            onChange={(e) => setStepNumber(Number(e.target.value))}
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer font-bold"
          >
            {Array.from({ length: maxSteps }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>#{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Async toggle inline */}
      <div className="flex items-center justify-between">
        <Label>{tr('Asenkron Akış', 'Async Mode')}</Label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={isAsync} onChange={(e) => setIsAsync(e.target.checked)} className="sr-only peer" />
          <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
        </label>
      </div>

      {/* Duration + Delay — side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label>{tr('Süre (ms)', 'Duration')}</Label>
          <CompactInput
            type="number" min="50" value={duration}
            onChange={(e) => setDuration(Math.max(50, Number(e.target.value)))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>{tr('Gecikme (ms)', 'Delay')}</Label>
          <CompactInput
            type="number" min="0" value={delay}
            onChange={(e) => setDelay(Math.max(0, Number(e.target.value)))}
          />
        </div>
      </div>

      {/* Simulation mode */}
      <Divider label={tr('Simülasyon', 'Simulation')} />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox" checked={formRoundTrip}
            onChange={(e) => setFormRoundTrip(e.target.checked)}
            className="accent-indigo-600 rounded cursor-pointer w-3.5 h-3.5"
          />
          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
            {tr('Gidiş-Dönüş', 'Round-Trip')}
          </span>
        </label>
      </div>

      <div className={`flex gap-3 transition-opacity duration-150 ${formRoundTrip ? 'opacity-30 pointer-events-none' : ''}`}>
        {(['forward', 'reverse'] as const).map((dir) => (
          <label key={dir} className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio" name="edge-direction" disabled={formRoundTrip}
              checked={formDirection === dir} onChange={() => setFormDirection(dir)}
              className="accent-indigo-600 cursor-pointer w-3.5 h-3.5"
            />
            <span className="text-[10px] text-slate-600 dark:text-slate-300">
              {dir === 'forward' ? tr('İleri (A→B)', 'Fwd (A→B)') : tr('Geri (B→A)', 'Rev (B→A)')}
            </span>
          </label>
        ))}
      </div>

      {/* Particle type — segmented */}
      <Divider label={tr('Parçacık', 'Particle')} />

      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
        {(['circle', 'arrow', 'envelope'] as const).map((pt) => (
          <button
            key={pt}
            onClick={() => setParticleType(pt)}
            className={`flex-1 py-1 text-[9px] rounded-md font-bold transition-colors leading-none ${
              particleType === pt
                ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {pt === 'circle' ? tr('Nokta', 'Dot') : pt === 'arrow' ? tr('Ok', 'Arrow') : tr('Zarf', 'Envelope')}
          </button>
        ))}
      </div>

      {/* Internal process tooltip — compact two-column layout */}
      <Divider label={tr('Tooltip', 'Tooltip')} />
      <div className="grid grid-cols-[1fr_72px] gap-2">
        <CompactInput
          type="text"
          placeholder={tr('İşlem adı...', 'Process name...')}
          value={tooltipText}
          onChange={(e) => setTooltipText(e.target.value)}
        />
        <CompactInput
          type="number" min="100" value={tooltipDuration}
          onChange={(e) => setTooltipDuration(Math.max(100, Number(e.target.value)))}
          placeholder="ms"
        />
      </div>

      {/* Description */}
      <Divider label={tr('Açıklama', 'Notes')} />
      <textarea
        rows={2}
        placeholder={tr('Bu adım hakkında not...', 'Step notes...')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 resize-none"
      />

    </div>
  );
});
