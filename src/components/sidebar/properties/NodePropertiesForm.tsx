import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { HandleConfig } from '../../../types';
import { resolveHandles } from '../../../utils/portUtils';
import { ConnectionPointsEditor } from './ConnectionPointsEditor';
import { ActiveNodeProperties } from '../../../types';

export type NodePropertiesFormRef = { submit: () => void };

interface NodePropertiesFormProps {
  activeNode: ActiveNodeProperties;
  language: string;
  connectedHandleIds: Set<string>;
  onSubmit: (
    id: string, name: string, type: string, theme: string,
    handles?: HandleConfig[], displayMode?: 'default' | 'icon-only',
    rotation?: number, customStyles?: any
  ) => void;
}

const THEME_COLORS = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan'] as const;
const BG: Record<string, string> = {
  indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', rose: 'bg-rose-500',
  amber: 'bg-amber-500',   violet: 'bg-violet-500',   cyan: 'bg-cyan-500',
};

/** Compact label used throughout the form */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
    {children}
  </span>
);

/** Compact text input */
const CompactInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
  />
);

/** Compact select */
const CompactSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer"
  />
);

/** Thin section divider */
const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-2 pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/70">
    {label && <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</span>}
    {label && <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/70" />}
  </div>
);

/**
 * NodePropertiesForm
 * Compact, focused form for editing a single node's properties.
 * All state is local; parent receives values only on submit.
 */
export const NodePropertiesForm = forwardRef<NodePropertiesFormRef, NodePropertiesFormProps>(({
  activeNode,
  language: lang,
  connectedHandleIds,
  onSubmit,
}, ref) => {
  const [name, setName] = useState(activeNode.name);
  const [type, setType] = useState(activeNode.type);
  const [theme, setTheme] = useState(activeNode.theme);
  const [handles, setHandles] = useState<HandleConfig[]>([]);
  const [displayMode, setDisplayMode] = useState<'default' | 'icon-only'>(activeNode.displayMode ?? 'default');
  const [rotation, setRotation] = useState(activeNode.rotation ?? 0);
  const [customStyles, setCustomStyles] = useState<any>(activeNode.customStyles ?? {});

  // Sync when active node changes
  useEffect(() => {
    setName(activeNode.name);
    setType(activeNode.type);
    setTheme(activeNode.theme);
    setHandles(resolveHandles(activeNode.handles).map((h) => ({ ...h, originalId: h.originalId || h.id })));
    setDisplayMode(activeNode.displayMode ?? 'default');
    setRotation(activeNode.rotation ?? 0);
    setCustomStyles(activeNode.customStyles ?? {});
  }, [activeNode]);
  useImperativeHandle(ref, () => ({
    submit: () => onSubmit(activeNode.id, name, type, theme, handles, displayMode, rotation, customStyles),
  }), [activeNode.id, name, type, theme, handles, displayMode, rotation, customStyles, onSubmit]);

  const isSection = activeNode.type === 'section';
  const tr = (t: string, e: string) => lang === 'tr' ? t : e;

  return (
    <div className="flex flex-col gap-2">

      {/* Name */}
      <div className="flex flex-col gap-1">
        <Label>{tr('Ad', 'Name')}</Label>
        <CompactInput value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* Type (not for sections) */}
      {!isSection && (
        <div className="flex flex-col gap-1">
          <Label>{tr('Tip', 'Type')}</Label>
          <CompactSelect value={type} onChange={(e) => setType(e.target.value)}>
            <option value="client">{tr('İstemci (Client)', 'Client')}</option>
            <option value="load_balancer">{tr('Yük Dengeleyici', 'Load Balancer')}</option>
            <option value="gateway">API Gateway</option>
            <option value="firewall">{tr('Güvenlik Duvarı', 'Firewall / WAF')}</option>
            <option value="server">{tr('Uygulama Sunucusu', 'App Server')}</option>
            <option value="database">{tr('Veritabanı (SQL)', 'Database')}</option>
            <option value="cache">{tr('Önbellek (Redis)', 'Cache Store')}</option>
            <option value="queue">{tr('Mesaj Kuyruğu', 'Message Queue')}</option>
          </CompactSelect>
        </div>
      )}

      {/* Theme color — inline row */}
      {!isSection && (
        <div className="flex items-center justify-between">
          <Label>{tr('Renk', 'Color')}</Label>
          <div className="flex gap-1.5">
            {THEME_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setTheme(c)}
                className={`w-5 h-5 rounded-full ${BG[c]} hover:scale-110 active:scale-90 transition-transform cursor-pointer ${
                  theme === c ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900' : ''
                }`}
                title={c}
              />
            ))}
          </div>
        </div>
      )}

      {!isSection && <Divider />}

      {/* Display mode + Rotation — side by side */}
      {!isSection && (
        <div className="grid grid-cols-2 gap-2">
          {/* Display mode */}
          <div className="flex flex-col gap-1">
            <Label>{tr('Görünüm', 'Display')}</Label>
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
              {(['default', 'icon-only'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDisplayMode(mode)}
                  className={`flex-1 py-1 text-[10px] rounded-md font-semibold transition-colors leading-none ${
                    displayMode === mode
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {mode === 'default' ? tr('Tam', 'Full') : tr('İkon', 'Icon')}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div className="flex flex-col gap-1">
            <Label>{tr('Yön', 'Orient.')}</Label>
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
              {([0, 90] as const).map((deg) => (
                <button
                  key={deg}
                  onClick={() => setRotation(deg)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] rounded-md font-semibold transition-colors leading-none ${
                    rotation === deg
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {deg === 0 ? (
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="1" y="4" width="12" height="6" rx="1.5" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="4" y="1" width="6" height="12" rx="1.5" />
                    </svg>
                  )}
                  {deg === 0 ? tr('Yatay', 'H') : tr('Dikey', 'V')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom styling — compact inline color pickers */}
      {!isSection && (
        <>
          <Divider label={tr('Özel Stil', 'Custom Style')} />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {[
              { key: 'backgroundColor', label: tr('Arkaplan', 'BG'), def: '#ffffff' },
              { key: 'borderColor', label: tr('Çerçeve', 'Border'), def: '#000000' },
            ].map(({ key, label, def }) => (
              <div key={key} className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={(customStyles as any)[key] || def}
                  onChange={(e) => setCustomStyles({ ...customStyles, [key]: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0 shrink-0"
                />
                <span className="text-[9px] text-slate-500 dark:text-slate-400 flex-1 truncate">{label}</span>
                <button
                  onClick={() => { const s = { ...customStyles }; delete (s as any)[key]; setCustomStyles(s); }}
                  className="text-[9px] text-rose-400 hover:text-rose-600 cursor-pointer shrink-0 leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Connection points editor */}
      <Divider />
      <ConnectionPointsEditor
        nodeId={activeNode.id}
        nodeName={name}
        handles={handles}
        connectedHandleIds={connectedHandleIds}
        language={lang}
        onChange={setHandles}
      />

    </div>
  );
});
