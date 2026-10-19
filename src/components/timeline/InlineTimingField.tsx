import { useEffect, useId, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { editingCopy } from '../../i18n/editingCopy';
import { commitInlineTiming, timingValue, type TimingField } from './inlineTiming';

/** Drafts stay local: typing creates neither history entries nor schedule work. */
export function InlineTimingField({ seqId, field }: { seqId: string; field: TimingField }) {
  const language = useAppStore(s => s.language);
  const value = useAppStore(s => s.visualData.timelines[seqId]?.[field] ?? (field === 'duration' ? 1000 : 0));
  const disabled = useAppStore(s => s.isPlaying || s.isReadOnly);
  const copy = editingCopy[language];
  const format = (number: number) => String(number).replace('.', language === 'tr' ? ',' : '.');
  const [draft, setDraft] = useState(() => format(value));
  const [error, setError] = useState<'invalid' | 'stale' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);
  const original = useRef({ document: useAppStore.getState().logicalData, value });
  const errorId = useId();
  useEffect(() => {
    // Step selection happens on pointerdown and may unmount this field before blur.
    // Finish the draft in capture phase, before any selection handler runs.
    const leaveField = (event: PointerEvent) => {
      const input = inputRef.current;
      if (input && document.activeElement === input && event.target !== input) input.blur();
    };
    document.addEventListener('pointerdown', leaveField, true);
    return () => document.removeEventListener('pointerdown', leaveField, true);
  }, []);
  useEffect(() => {
    if (!focused.current || disabled) { setDraft(format(value)); setError(null); }
  }, [value, language, disabled]);
  const reset = () => {
    const current = timingValue(seqId, field);
    setDraft(format(current)); setError(null);
    original.current = { document: useAppStore.getState().logicalData, value: current };
  };
  const commit = () => {
    const result = commitInlineTiming(seqId, field, draft, original.current.document, original.current.value);
    if (result === 'invalid') { setError('invalid'); return; }
    reset();
    if (result === 'stale') setError('stale');
  };
  return <label className="yada-inline-timing">
    <span>{field === 'duration' ? copy.shortDuration : copy.delay}</span>
    <span className="yada-inline-timing-control" data-invalid={!!error}>
      <input ref={inputRef} type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
        aria-label={field === 'duration' ? copy.duration : copy.delay} aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined} title={copy.inlineTimingHint}
        disabled={disabled} value={draft}
        onFocus={() => { focused.current = true; original.current = { document: useAppStore.getState().logicalData, value: timingValue(seqId, field) }; }}
        onChange={event => { setDraft(event.target.value); setError(null); }}
        onBlur={() => { focused.current = false; commit(); }}
        onKeyDown={event => {
          if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); commit(); }
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); reset(); }
        }} />
      <span aria-hidden="true">ms</span>
    </span>
    {error && <span id={errorId} role="alert" className="yada-inline-timing-error">{error === 'invalid' ? copy.inlineTimingInvalid : copy.inlineTimingStale}</span>}
  </label>;
}
