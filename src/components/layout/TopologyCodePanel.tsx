import './TopologyCodePanel.css';
import { highlightTopology } from '../../dsl/syntax';
import { completions, edgeAt, nextStep, setEdgeOption } from '../../dsl/completion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { compileTopology, DslError, generateTopology, parseTopology, unsupportedTopology } from '../../dsl/topology';
import { applyDslSource, discardDslDraft, saveDslDraft } from '../../dsl/editorActions';

export function TopologyCodePanel({ onClose }: { onClose: () => void }) {
  const logical = useAppStore(s => s.logicalData);
  const visual = useAppStore(s => s.visualData);
  const language = useAppStore(s => s.language);
  const readOnly = useAppStore(s => s.isReadOnly);
  const collab = useAppStore(s => s.isCollabActive);
  const selectedNode = useAppStore(s => s.activeNodeProperties?.id);
  const selectedEdge = useAppStore(s => s.activeEdgeProperties?.id);
  const tr = language === 'tr';
  const generated = useMemo(() => logical.dsl ?? generateTopology(logical, visual), [logical, visual]);
  const text = generated.draft ?? generated.source;
  const pending = generated.draft !== undefined;
  const unsupported = unsupportedTopology(logical, visual);
  const locked = readOnly || collab || !!unsupported;
  const conflict = generated.draftBase !== undefined && generated.draftBase !== generated.source;
  const [commitError, setCommitError] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const paint = useRef<HTMLDivElement>(null);
  const highlighted = useMemo(() => highlightTopology(text), [text]);
  const lineNumbers = useRef<HTMLDivElement>(null);
  const suggestionList = useRef<HTMLDivElement>(null);
  // Match the textarea's inner viewport, excluding native scrollbars, so the
  // paint layer and gutter remain aligned at both scroll limits and on resize.
  useEffect(() => {
    const input = editor.current;
    if (!input) return;
    const sync = () => {
      if (paint.current) {
        paint.current.style.width = `${input.clientWidth}px`;
        paint.current.style.height = `${input.clientHeight}px`;
        paint.current.scrollTop = input.scrollTop;
        paint.current.scrollLeft = input.scrollLeft;
      }
      if (lineNumbers.current) {
        lineNumbers.current.style.height = `${input.clientHeight}px`;
        lineNumbers.current.scrollTop = input.scrollTop;
      }
    };
    const observer = new ResizeObserver(sync);
    observer.observe(input); sync();
    return () => observer.disconnect();
  }, []);
  const [cursor, setCursor] = useState(0);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const suggestions = useMemo(() => completions(text, cursor), [text, cursor]);
  const currentEdge = useMemo(() => edgeAt(text, cursor), [text, cursor]);
  const showSuggestions = suggesting && !locked && !conflict && suggestions.items.length > 0;
  const activeSuggestion = Math.min(suggestionIndex, Math.max(0, suggestions.items.length - 1));
  const detail = (key: string) => ({step: tr ? 'Oynatma sırası' : 'Playback order', duration: tr ? 'Geçiş süresi' : 'Transit duration', repeat: tr ? 'Sürekli akıştaki parçacık sayısı' : 'Continuous-flow particle count', roundtrip: tr ? 'Gidiş ve dönüş' : 'Round trip', protocol: tr ? 'İletişim protokolü' : 'Protocol'}[key] ?? key);
  const replaceText = (value: string, position: number) => {
    if (locked || conflict) return;
    saveDslDraft(value);
    setCursor(position); setSuggesting(false);
    requestAnimationFrame(() => {editor.current?.focus(); editor.current?.setSelectionRange(position, position);});
  };
  const acceptSuggestion = (index: number) => {
    const item = suggestions.items[index]; if (!item) return;
    replaceText(text.slice(0, suggestions.from) + item.insert + text.slice(suggestions.to), suggestions.from + item.insert.length);
  };
  const updateOption = (key: string, value?: string) => {
    const result = setEdgeOption(text, cursor, key, value);
    if (result) replaceText(result.text, result.cursor);
  };
  useEffect(() => {
    if (showSuggestions) suggestionList.current?.children[activeSuggestion]?.scrollIntoView({block: 'nearest'});
  }, [showSuggestions, activeSuggestion]);
  const validation = useMemo(() => {
    if (locked) return {error: '', deleted: 0, line: undefined as number | undefined};
    try { return {error: '', deleted: compileTopology(text, logical, visual, generated).deleted, line: undefined as number | undefined}; }
    catch (error) { return {error: error instanceof DslError ? `${tr ? 'Satır' : 'Line'} ${error.line}: ${error.message}` : String(error), deleted: 0, line: error instanceof DslError ? error.line : undefined}; }
  }, [text, logical, visual, generated, locked, tr]);

  useEffect(() => {
    setCommitError('');
    if (!pending || locked || conflict || validation.error || validation.deleted) return;
    const timer = window.setTimeout(() => {
      try { applyDslSource(text); } catch (error) { setCommitError((error as Error).message); }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [text, pending, locked, conflict, validation.error, validation.deleted]);

  useEffect(() => {
    if (pending || !editor.current || document.activeElement === editor.current) return;
    const alias = Object.entries(selectedEdge ? generated.edgeIds : generated.nodeIds).find(([, id]) => id === (selectedEdge ?? selectedNode))?.[0];
    if (!alias) return;
    try {
      const parsed = parseTopology(text);
      const declaration = parsed.declarations.find(d => d.id === alias);
      if (!declaration) return;
      const start = parsed.lines.slice(0, declaration.line).reduce((sum, line) => sum + line.length + 1, 0);
      setCursor(start);
      editor.current.setSelectionRange(start, start + parsed.lines[declaration.line].length);
      editor.current.scrollTop = Math.max(0, declaration.line * 24 - editor.current.clientHeight / 2);
    } catch { /* Unsupported legacy documents remain readable. */ }
  }, [selectedNode, selectedEdge, text, generated, pending]);

  const goToError = () => {
    if (!validation.line || !editor.current) return;
    const start = text.split('\n').slice(0, validation.line - 1).reduce((sum, line) => sum + line.length + 1, 0);
    const errorLine = validation.line;
    setCursor(start); setSuggesting(false);
    // Quick controls can appear for the selected edge and resize the editor.
    requestAnimationFrame(() => {
      const input = editor.current;
      if (!input) return;
      input.focus(); input.setSelectionRange(start, start);
      input.scrollTop = Math.max(0, (errorLine - 1) * 24 - input.clientHeight / 2);
      input.scrollLeft = 0;
    });
  };
  const applyDeletion = async () => {
    const before = useAppStore.getState();
    const accepted = await before.openConfirm({title: tr ? 'Silme işlemini uygula' : 'Apply deletions', message: tr ? `${validation.deleted} bileşen, bağlantı veya adım kaldırılacak. Bu işlem geri alınabilir.` : `${validation.deleted} components, connections or steps will be removed. You can undo this change.`, confirmText: tr ? 'Uygula' : 'Apply', cancelText: tr ? 'İptal' : 'Cancel', type: 'danger'});
    const current = useAppStore.getState();
    if (!accepted || current.activeDiagramId !== before.activeDiagramId || current.logicalData.dsl?.draft !== text) return;
    try { applyDslSource(text, true); } catch (error) { setCommitError((error as Error).message); }
  };
  const status = locked
    ? collab ? (tr ? 'Ortak çalışmada kod görünümü salt okunurdur.' : 'Code is read-only during collaboration.') : unsupported ? (tr ? 'Bu belge ilk sürümün kapsamı dışında; kayıpları önlemek için salt okunur.' : 'This document exceeds the first version’s scope; code is read-only to preserve its data.') : (tr ? 'Salt okunur' : 'Read-only')
    : conflict ? (tr ? 'Belge değişti. Devam etmek için güncel kodu geri yükleyin; taslağınızı önce kopyalayabilirsiniz.' : 'The document changed. Copy your draft if needed, then restore current code.')
    : validation.error || commitError || (validation.deleted ? (tr ? 'Silme işlemi onay bekliyor.' : 'Deletion needs confirmation.') : pending ? (tr ? 'Düzenleniyor — çizim son geçerli sürümü gösteriyor.' : 'Editing — canvas shows the last valid version.') : (tr ? 'Senkronize' : 'Synchronized'));
  return <section className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-text" aria-label={tr ? 'Topoloji kodu' : 'Topology code'}>
    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-3 py-2 text-sm">
      <strong>{tr ? 'Topoloji kodu' : 'Topology code'}</strong>
      <button type="button" onClick={onClose} className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={tr ? 'Kod panelini kapat' : 'Close code panel'}>×</button>
    </div>
    <label className="flex items-center justify-between gap-2 px-3 py-2 text-xs border-b border-slate-200 dark:border-slate-800">
      <span>{tr ? 'Otomatik düzen' : 'Auto-layout'}</span>
      <select aria-label={tr ? 'Kod yerleşim yönü' : 'Code layout direction'} disabled={locked || pending} value={visual.autoLayoutDirection ?? 'LR'}
        onChange={e => {void useAppStore.getState().applyAutoLayout(e.target.value as 'LR' | 'TB');}}
        className="max-w-[65%] rounded border border-slate-300 dark:border-slate-600 bg-transparent px-2 py-1">
        <option value="LR">{tr ? 'Soldan sağa' : 'Left to right'}</option>
        <option value="TB">{tr ? 'Yukarıdan aşağıya' : 'Top to bottom'}</option>
      </select>
    </label>
    <div className="flex flex-1 min-h-0 overflow-hidden">
    <div ref={lineNumbers} aria-hidden="true" className="shrink-0 overflow-hidden border-r border-slate-100 dark:border-slate-800 py-3 px-2 text-right text-xs leading-6 text-slate-400 select-none" style={{fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'}}>
      {highlighted.map((_, index) => <div key={index} title={validation.line === index + 1 ? validation.error : undefined} className={validation.line === index + 1 ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-l-2 border-red-500' : ''}>{validation.line === index + 1 ? '● ' : ''}{index + 1}</div>)}
    </div>
    <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
    <div ref={paint} aria-hidden="true" className="topology-editor-paint absolute inset-0 overflow-hidden">
      {highlighted.map((tokens, index) => <div key={index} className={`topology-code-line ${validation.line === index + 1 ? 'topology-code-error' : ''}`}>
        {tokens.length ? tokens.map((token, tokenIndex) => <span key={tokenIndex} className={`topology-token-${token.kind}`}>{token.text}</span>) : '\u200b'}
      </div>)}
    </div>
    <textarea ref={editor} aria-invalid={!!validation.line} aria-errormessage={validation.line ? 'topology-code-diagnostic' : undefined} style={{fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'}} onScroll={e => {if (lineNumbers.current) lineNumbers.current.scrollTop = e.currentTarget.scrollTop; if (paint.current) {paint.current.scrollTop = e.currentTarget.scrollTop; paint.current.scrollLeft = e.currentTarget.scrollLeft;}}} aria-label={tr ? 'YADA kod editörü' : 'YADA code editor'} spellCheck={false} autoCapitalize="off" autoCorrect="off" readOnly={locked}
      role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls={showSuggestions ? 'topology-completions' : undefined} aria-activedescendant={showSuggestions ? `topology-completion-${activeSuggestion}` : undefined}
      value={text} onSelect={e => setCursor(e.currentTarget.selectionStart)} onBlur={() => setSuggesting(false)}
      onChange={e => {saveDslDraft(e.target.value); setCursor(e.target.selectionStart); setSuggestionIndex(0); setSuggesting(true);}}
      onKeyDown={e => {
        if (e.nativeEvent.isComposing) return;
        if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {e.preventDefault(); setCursor(e.currentTarget.selectionStart); setSuggestionIndex(0); setSuggesting(true); return;}
        if (showSuggestions && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (e.key === 'Escape') {e.preventDefault(); e.stopPropagation(); setSuggesting(false); return;}
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {e.preventDefault(); setSuggestionIndex((activeSuggestion + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.items.length) % suggestions.items.length); return;}
          if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) {e.preventDefault(); acceptSuggestion(activeSuggestion); return;}
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (!locked && !conflict && !validation.error && !validation.deleted) { try { applyDslSource(text); } catch (error) { setCommitError((error as Error).message); } } }
        // Native undo owns uncommitted typing; committed transactions use document history.
        if (!pending && !locked && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); if (e.shiftKey) useAppStore.getState().redo(); else useAppStore.getState().undo(); }
      }}
      onClick={e => {
        try {
          const line = text.slice(0, e.currentTarget.selectionStart).split('\n').length - 1;
          const d = parseTopology(text).declarations.find(item => item.line === line);
          if (d?.kind === 'node') useAppStore.getState().setFocusedNodeId(generated.nodeIds[d.id] ?? null);
        } catch { /* Drafts may be incomplete. */ }
      }}
      className="topology-editor-input absolute inset-0 h-full w-full resize-none bg-transparent outline-none focus:ring-1 focus:ring-inset focus:ring-indigo-500" wrap="off" />
    </div>
    </div>
    {showSuggestions && <div className="shrink-0 border-t border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-slate-950">
      <div className="px-3 py-1 text-[11px] text-slate-500">{tr ? 'Öneriler · ↑↓ seç · Enter/Tab ekle · Esc kapat' : 'Suggestions · ↑↓ select · Enter/Tab insert · Esc dismiss'}</div>
      <div ref={suggestionList} id="topology-completions" role="listbox" aria-label={tr ? 'Kod önerileri' : 'Code suggestions'} className="max-h-36 overflow-auto">
        {suggestions.items.map((item, index) => <div key={item.label} id={`topology-completion-${index}`} role="option" aria-selected={index === activeSuggestion}
          onMouseDown={e => e.preventDefault()} onClick={() => acceptSuggestion(index)}
          className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-xs ${index === activeSuggestion ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
          <code>{item.label}</code><span className="truncate text-slate-500 dark:text-slate-400">{detail(item.detail)}</span>
        </div>)}
      </div>
    </div>}
    {currentEdge && !locked && !conflict && <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-3 text-xs space-y-2">
      <div className="font-medium">{tr ? 'Bu bağlantıyı düzenle' : 'Edit this connection'}</div>
      <div className="grid grid-cols-2 gap-2">
        <label>{detail('step')}<select aria-label={tr ? 'Bağlantı sırası' : 'Connection step'} value={currentEdge.step} onChange={e => updateOption('step', e.target.value || undefined)} className="block w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-1">
          <option value="">{tr ? 'Belirtilmemiş' : 'Unspecified'}</option>
          {[...new Set([...Array.from({length: 10}, (_, i) => String(i + 1)), String(nextStep(text)), ...(currentEdge.step ? [currentEdge.step] : [])])].sort((a,b) => Number(a)-Number(b)).map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>{detail('duration')}<select aria-label={tr ? 'Bağlantı süresi' : 'Connection duration'} value={currentEdge.duration} onChange={e => updateOption('duration', e.target.value || undefined)} className="block w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-1">
          <option value="">{tr ? 'Mevcut / varsayılan' : 'Existing / default'}</option>
          {[...new Set(['250ms','500ms','800ms','1s','1.2s','2s','5s', ...(currentEdge.duration ? [currentEdge.duration] : [])])].map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>{tr ? 'Oynatma biçimi' : 'Playback mode'}<select aria-label={tr ? 'Bağlantı oynatma biçimi' : 'Connection playback mode'} value={currentEdge.repeat ? 'repeat' : currentEdge.roundtrip ? 'roundtrip' : 'normal'} onChange={e => updateOption(e.target.value === 'normal' ? 'mode' : e.target.value, e.target.value === 'repeat' ? '3' : e.target.value === 'roundtrip' ? '' : undefined)} className="block w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-1">
          <option value="normal">{tr ? 'Tek yön' : 'One way'}</option><option value="roundtrip" disabled={currentEdge.async}>{tr ? 'Gidiş-dönüş' : 'Round trip'}</option><option value="repeat">{tr ? 'Sürekli akış' : 'Continuous flow'}</option>
        </select></label>
        {currentEdge.repeat && <label>{tr ? 'Parçacık sayısı' : 'Particle count'}<select aria-label={tr ? 'Parçacık sayısı' : 'Particle count'} value={currentEdge.repeat} onChange={e => updateOption('repeat', e.target.value)} className="block w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-1">
          {Array.from({length: 10}, (_, i) => <option key={i} value={i+1}>{i+1}</option>)}
        </select></label>}
      </div>
    </div>}
    <div className="border-t border-slate-200 dark:border-slate-800 p-3 text-xs space-y-2">
      <p id="topology-code-diagnostic" role="status" aria-live="polite" className={validation.error || conflict || commitError ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}>{status}</p>
      {!!validation.line && <button type="button" onClick={goToError} className="text-red-700 dark:text-red-300 underline underline-offset-2">{tr ? `Hatalı satıra git (${validation.line})` : `Go to error (line ${validation.line})`}</button>}
      {unsupported && <p className="text-slate-500">{unsupported}</p>}
      {pending && !readOnly && !collab && <div className="flex flex-wrap gap-2">
        {!!validation.deleted && !locked && !validation.error && !conflict && <button type="button" onClick={() => void applyDeletion()} className="rounded bg-indigo-600 px-3 py-1.5 text-white">{tr ? 'Silme işlemini uygula' : 'Apply deletions'}</button>}
        <button type="button" onClick={discardDslDraft} className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1.5">{tr ? 'Güncel kodu geri yükle' : 'Restore current code'}</button>
      </div>}
      <details className="text-slate-500 dark:text-slate-400"><summary className="cursor-pointer">{tr ? 'Sözdizimi ve oynatma' : 'Syntax and playback'}</summary>
        <pre className="overflow-auto py-2 text-[11px]">{'service api "API"\ndatabase db "Database"\napi --> db : "Query" @query [step=1, roundtrip, duration=1s]'}</pre>
        <p className="mb-2">{tr ? 'Node ve bağlantı seçenekleri yazarken önerilir. Ctrl+Space ile önerileri açabilirsiniz. Bağlantı satırına tıklayarak hızlı seçimleri kullanın.' : 'Node IDs and connection options are suggested as you type. Press Ctrl+Space for suggestions, or click a connection line for quick controls.'}</p>
        <p>{tr ? 'step: sıra · duration: geçiş süresi · repeat=3: sürekli akıştaki parçacık sayısı (tekrar sayısı değil). Hiç step yoksa satır sırası kullanılır. En az bir step varsa yalnızca numaralı bağlantılar oynatılır.' : 'step: order · duration: transit time · repeat=3: particle count in continuous flow (not repetitions). Without step options, line order is used. With any explicit step, only numbered connections play.'}</p>
      </details>
    </div>
  </section>;
}
