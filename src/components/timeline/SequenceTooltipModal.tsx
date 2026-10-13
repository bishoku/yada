import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';
import { formatMilliseconds } from '../../i18n/terminology';
import { parseTiming } from './timingModel';
import { commitStepTiming } from './timingActions';

interface SequenceTooltipModalProps { seqId: string; onClose: () => void }

/** Explicit editing leaves legacy values untouched until the user applies a change. */
export function SequenceTooltipModal({ seqId, onClose }: SequenceTooltipModalProps) {
  const timing = useAppStore(s => s.visualData.timelines[seqId]);
  const schedule = useAppStore(s => s.schedules[seqId]);
  const language = useAppStore(s => s.language);
  const disabled = useAppStore(s => s.isReadOnly || s.isPlaying);
  const t = translations[language];
  const [duration, setDuration] = useState(String(timing?.duration ?? 1000));
  const [delay, setDelay] = useState(String(timing?.delay ?? 0));
  const [text, setText] = useState(timing?.internalProcess?.text ?? '');
  const [processDuration, setProcessDuration] = useState(String(timing?.internalProcess?.duration ?? 1000));
  const [error, setError] = useState<'invalidTiming' | 'staleEdit' | null>(null);
  const original = useRef({ document: useAppStore.getState().logicalData, timing });
  const dialog = useRef<HTMLFormElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const previous = useRef(document.activeElement);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); if (previous.current instanceof HTMLElement) previous.current.focus(); };
  }, []);
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (useAppStore.getState().logicalData !== original.current.document || useAppStore.getState().visualData.timelines[seqId] !== original.current.timing) { setError('staleEdit'); return; }
    const parsed = parseTiming(duration, delay);
    const process = parseTiming(processDuration, '0');
    if (!parsed || (text && !process)) { setError('invalidTiming'); return; }
    commitStepTiming(seqId, parsed, { text, duration: process?.duration ?? timing?.internalProcess?.duration ?? 1000 }, original.current.document);
    onClose();
  };
  const inputClass = 'w-full rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950';
  return createPortal(<div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
    <form ref={dialog} role="dialog" aria-modal="true" aria-labelledby="step-timing-title" onSubmit={save} className="w-full max-w-md max-h-[90vh] overflow-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl p-5 space-y-4 text-sm">
      <h2 id="step-timing-title" className="font-bold">{t.timelineUi.editStep}</h2>
      {schedule && <p>{t.terms.start}: {formatMilliseconds(schedule.start, language)} · {t.terms.end}: {formatMilliseconds(schedule.end, language)}</p>}
      <p className="text-xs text-slate-500 dark:text-slate-400">{t.timelineUi.timingHelp}</p>
      <fieldset disabled={disabled} className="grid grid-cols-2 gap-3">
        <label>{t.timelineUi.duration}<input autoFocus className={inputClass} type="number" min="0" step="any" value={duration} onChange={e => setDuration(e.target.value)} /></label>
        <label>{t.timelineUi.delay}<input className={inputClass} type="number" min="0" step="any" value={delay} onChange={e => setDelay(e.target.value)} /></label>
        <label className="col-span-2">{t.timelineUi.processText}<input className={inputClass} value={text} placeholder={t.timelineUi.processPlaceholder} onChange={e => setText(e.target.value)} /></label>
        <label className="col-span-2">{t.timelineUi.processDuration}<input className={inputClass} type="number" min="0" step="any" value={processDuration} onChange={e => setProcessDuration(e.target.value)} /></label>
      </fieldset>
      <p className="text-xs text-slate-500">{t.timelineUi.processHint}</p>
      {error && <p role="alert" className="text-red-500">{t.timelineUi[error]}</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose}>{t.cancel}</button><button type="submit" disabled={disabled} className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">{t.timelineUi.apply}</button></div>
    </form>
  </div>, document.body);
}
