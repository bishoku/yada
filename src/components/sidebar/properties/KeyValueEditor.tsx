import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface KeyValueEditorProps {
  properties: Record<string, unknown>;
  onChange: (properties: Record<string, unknown>) => void;
  language: string;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  properties,
  onChange,
  language,
}) => {
  const tr = (t: string, e: string) => (language === 'tr' ? t : e);

  // Maintain local array representation for easy editing
  const [items, setItems] = useState<Array<{ id: string; key: string; value: string }>>([]);

  useEffect(() => {
    // Sync from parent properties
    const initialItems = Object.entries(properties).map(([k, v], idx) => ({
      id: `${idx}-${Date.now()}-${Math.random()}`,
      key: k,
      value: String(v),
    }));
    // Only update if current items don't match the new properties to avoid infinite loop
    const currentKeys = items.map((i) => i.key).join(',');
    const currentValues = items.map((i) => i.value).join(',');
    const nextKeys = Object.keys(properties).join(',');
    const nextValues = Object.values(properties).map(String).join(',');
    if (currentKeys !== nextKeys || currentValues !== nextValues) {
      setItems(initialItems.length > 0 ? initialItems : []);
    }
  }, [properties]);

  const handleUpdate = (updatedItems: Array<{ id: string; key: string; value: string }>) => {
    setItems(updatedItems);
    // Convert back to Record
    const nextProps: Record<string, unknown> = {};
    updatedItems.forEach((item) => {
      if (item.key.trim() !== '') {
        nextProps[item.key.trim()] = item.value;
      }
    });
    onChange(nextProps);
  };

  const addItem = () => {
    const next = [...items, { id: `${Date.now()}-${Math.random()}`, key: '', value: '' }];
    handleUpdate(next);
  };

  const removeItem = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    handleUpdate(next);
  };

  const changeItem = (id: string, field: 'key' | 'value', val: string) => {
    const next = items.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    handleUpdate(next);
  };

  // Check for duplicate keys
  const keys = items.map((i) => i.key.trim().toLowerCase()).filter(Boolean);
  const hasDuplicates = new Set(keys).size !== keys.length;

  return (
    <div className="flex flex-col gap-1.5 mt-2 border-t border-slate-100 dark:border-slate-800/70 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
          {tr('Öznitelikler (Attributes)', 'Attributes')}
        </span>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer transition-colors"
        >
          <Plus className="w-2.5 h-2.5" />
          <span>{tr('Ekle', 'Add')}</span>
        </button>
      </div>

      {items.length === 0 ? (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic pl-1 py-1">
          {tr('Öznitelik yok.', 'No attributes.')}
        </span>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-1">
              <input
                type="text"
                placeholder={tr('Anahtar', 'Key')}
                value={item.key}
                onChange={(e) => changeItem(item.id, 'key', e.target.value)}
                className="w-1/2 px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                placeholder={tr('Değer', 'Value')}
                value={item.value}
                onChange={(e) => changeItem(item.id, 'value', e.target.value)}
                className="w-1/2 px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="p-1 rounded text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {hasDuplicates && (
            <span className="text-[9px] text-rose-500 font-semibold mt-0.5 leading-none">
              {tr('Aynı anahtar isminden birden fazla var', 'Duplicate keys are not allowed')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
