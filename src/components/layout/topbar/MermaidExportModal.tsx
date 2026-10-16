import { Textarea } from '../../ui/Field';
import { ModalSurface } from '../../ui/ModalSurface';
import { useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../i18n/translations';
import { generateMermaidSequence } from '../../../utils/exportMermaid';
import { StorageService, isTauri } from '../../../services/storage';
import { save } from '@tauri-apps/plugin-dialog';

export function MermaidExportModal({ onClose }: { onClose: () => void }) {
  const logical = useAppStore(s => s.logicalData);
  const visual = useAppStore(s => s.visualData);
  const workspace = useAppStore(s => s.currentWorkspace);
  const language = useAppStore(s => s.language);
  const t = translations[language];
  const result = useMemo(() => generateMermaidSequence(logical, visual), [logical, visual]);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(result.text); setCopied(true); setError(false); }
    catch { setError(true); }
  };
  const download = async () => {
    try {
      const filename = `${workspace?.name || 'diagram'}.mmd`;
      if (isTauri()) {
        const path = await save({ defaultPath: filename, filters: [{ name: 'Mermaid', extensions: ['mmd'] }] });
        if (path) await StorageService.save_text_file(path, result.text);
      } else {
        const url = URL.createObjectURL(new Blob([result.text], { type: 'text/plain;charset=utf-8' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setError(false);
    } catch { setError(true); }
  };
  return <ModalSurface label={t.mermaid.exportTitle} onClose={onClose} width="42rem">
    <section    className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-2xl max-h-[90vh] overflow-auto text-slate-800 dark:text-slate-200">
      <h2 id="mermaid-export-title" className="font-bold mb-3">{t.mermaid.exportTitle}</h2>
      <ul className="text-xs mb-3 space-y-1">{result.warnings.map(code => <li key={code}>{t.mermaid[code]}</li>)}</ul>
      <Textarea aria-label={t.mermaid.exportLabel} readOnly value={result.text} rows={14} className="w-full font-mono" />
      {error && <p role="alert" className="text-red-500 text-sm">{t.mermaid.exportError}</p>}
      <div className="flex gap-3 justify-end mt-4">
        <button autoFocus data-dialog-autofocus="" onClick={onClose} className="px-3 py-2 text-sm">{t.close}</button>
        <button onClick={copy} className="px-3 py-2 text-sm">{copied ? t.mermaid.copied : t.mermaid.copy}</button>
        <button onClick={download} className="px-3 py-2 text-sm rounded bg-indigo-600 text-white">{t.mermaid.download}</button>
      </div>
    </section>
  </ModalSurface>;
}
