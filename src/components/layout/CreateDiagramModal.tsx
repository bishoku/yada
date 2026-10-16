import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { useId } from 'react';
import { ModalSurface } from '../ui/ModalSurface';
import { message } from '../../i18n/messages';
import { getPlatformCapabilities } from '../../services/platformCapabilities';
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';
import { X, FilePlus } from 'lucide-react';

export const CreateDiagramModal: React.FC = () => {
  const fieldPrefix = useId();
  const isCreateDiagramModalOpen = useAppStore((s) => s.isCreateDiagramModalOpen);
  const setCreateDiagramModalOpen = useAppStore((s) => s.setCreateDiagramModalOpen);
  const createDiagram = useAppStore((s) => s.createDiagram);
  const switchDiagram = useAppStore((s) => s.switchDiagram);
  const diagrams = useAppStore((s) => s.diagrams);
  const language = useAppStore((s) => s.language);

  const [name, setName] = useState('');

  const t = translations[language];

  // Auto-fill default name on open
  useEffect(() => {
    if (isCreateDiagramModalOpen) {
      const prefix = message(language, "CreateDiagramModal.newDiagram");
      let defaultName = prefix;
      if (diagrams.some((d) => d.name === prefix)) {
        let count = 1;
        while (diagrams.some((d) => d.name === `${prefix} ${count}`)) {
          count++;
        }
        defaultName = `${prefix} ${count}`;
      }
      setName(defaultName);
    }
  }, [isCreateDiagramModalOpen, diagrams, language]);




  if (!isCreateDiagramModalOpen || !getPlatformCapabilities().canCreateDiagram) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const newDiag = await createDiagram(name.trim());
      setCreateDiagramModalOpen(false);
      await switchDiagram(newDiag.id);
    } catch (err) {
      console.error('Failed to create diagram:', err);
    }
  };

  return (
    <ModalSurface label={message(language, "CreateDiagramModal.createNewDiagram")} onClose={() => setCreateDiagramModalOpen(false)} width="28rem">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl transition-all animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-indigo-500" />
            {message(language, "CreateDiagramModal.createNewDiagram")}
          </h3>
          <button
            onClick={() => setCreateDiagramModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
           aria-label={message(language, "common.close")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2" htmlFor={`${fieldPrefix}-modal-field-1`}>
              {message(language, "CreateDiagramModal.diagramName")}
            </label>
            <Input
              autoFocus data-dialog-autofocus=""
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
              placeholder={message(language, "CreateDiagramModal.eGNewArchitecturePlan")}
             id={`${fieldPrefix}-modal-field-1`}/>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateDiagramModalOpen(false)}
              className="px-4 py-2 bg-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
             data-dialog-autofocus="">
              {t.cancel}
            </button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/45 text-white font-bold rounded-xl text-xs transition-all duration-200 cursor-pointer shadow-md shadow-indigo-600/10 dark:shadow-none"
            >
              {message(language, "CreateDiagramModal.create")}
            </Button>
          </div>
        </form>
      </div>
    </ModalSurface>
  );
};
