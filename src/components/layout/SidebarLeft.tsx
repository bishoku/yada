import React, { useCallback } from 'react';
import { 
  Folder, FileJson, Boxes, Laptop, Network, Server, Database, Zap, ArrowRightLeft, 
  Plus, Download, Upload, Edit, Trash2 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { CustomComponentTemplate } from '../../types';
import { CustomSvgRenderer } from '../canvas/CustomSvgRenderer';

export const SidebarLeft: React.FC = () => {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const language = useAppStore((s) => s.language);
  const startDrag = useAppStore((s) => s.startDrag);
  const pendingDrop = useAppStore((s) => s.pendingDrop);
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen);
  
  const libraryComponentsList = useAppStore((s: any) => s.libraryComponents);
  const setView = useAppStore((s: any) => s.setView);
  const setActiveComponent = useAppStore((s: any) => s.setActiveComponent);
  const deleteComponentFromLibrary = useAppStore((s: any) => s.deleteComponentFromLibrary);

  const t = translations[language];

  // List of drag-and-drop template components
  const libraryComponents = [
    { type: 'client', name: language === 'tr' ? 'İstemci (Web/App)' : 'Client (Web/App)', defaultName: 'Client', icon: <Laptop className="w-4 h-4 text-indigo-500" /> },
    { type: 'gateway', name: 'API Gateway', defaultName: 'API Gateway', icon: <Network className="w-4 h-4 text-emerald-500" /> },
    { type: 'server', name: language === 'tr' ? 'Uygulama Sunucusu' : 'App Server', defaultName: 'App Server', icon: <Server className="w-4 h-4 text-violet-500" /> },
    { type: 'database', name: language === 'tr' ? 'Veritabanı (SQL)' : 'Database (SQL)', defaultName: 'Database', icon: <Database className="w-4 h-4 text-rose-500" /> },
    { type: 'cache', name: language === 'tr' ? 'Önbellek (Redis)' : 'Cache Store (Redis)', defaultName: 'Cache Store', icon: <Zap className="w-4 h-4 text-amber-500" /> },
    { type: 'queue', name: language === 'tr' ? 'Mesaj Kuyruğu' : 'Message Queue', defaultName: 'Message Queue', icon: <ArrowRightLeft className="w-4 h-4 text-cyan-500" /> },
  ];

  const handleMouseDown = useCallback((type: string, defaultName: string) => {
    console.log('[SidebarLeft] mouseDown → startDrag:', type, defaultName);
    startDrag(type, defaultName);
  }, [startDrag]);

  // Launch Studio to design a new component
  const handleCreateNewCustomComponent = () => {
    const compId = `custom-comp-${Date.now()}`;
    const newComp: CustomComponentTemplate = {
      componentId: compId,
      name: language === 'tr' ? 'Özel Bileşen' : 'Custom Component',
      category: 'Custom',
      dimensions: { width: 200, height: 200 },
      layers: [],
      createdAt: new Date().toISOString()
    };
    setActiveComponent(newComp);
    setView('studio');
  };

  // Import JSON component file from disk
  const handleImportComponent = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        filters: [{ name: 'JSON Component', extensions: ['json'] }],
        title: language === 'tr' ? 'Bileşen Dosyası Seç' : 'Choose Component File'
      });
      if (selected && typeof selected === 'string') {
        const content: string = await invoke('read_text_file', { path: selected });
        const parsed = JSON.parse(content);
        if (parsed.componentId && parsed.name && Array.isArray(parsed.layers)) {
          const targetPath = `${currentWorkspace?.path}/components/${parsed.componentId}.json`;
          await invoke('save_text_file', { path: targetPath, content });
          const state = useAppStore.getState() as any;
          await state.loadLibrary();
        } else {
          alert('Invalid component file structure.');
        }
      }
    } catch (err) {
      console.error('Import error:', err);
    }
  };

  // Export custom component as JSON to disk
  const handleExportComponent = async (comp: CustomComponentTemplate) => {
    try {
      const savePath = await save({
        defaultPath: `${comp.name}.json`,
        filters: [{ name: 'JSON Component', extensions: ['json'] }],
        title: language === 'tr' ? 'Bileşeni Kaydet' : 'Save Component File'
      });
      if (savePath) {
        await invoke('save_text_file', { path: savePath, content: JSON.stringify(comp, null, 2) });
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleEditComponent = (comp: CustomComponentTemplate) => {
    setActiveComponent(comp);
    setView('studio');
  };

  const handleDeleteComponent = async (compId: string) => {
    const confirmMsg = language === 'tr' 
      ? 'Bu özel bileşeni silmek istediğinize emin misiniz?' 
      : 'Are you sure you want to delete this custom component?';
    if (window.confirm(confirmMsg)) {
      await deleteComponentFromLibrary(compId);
    }
  };

  return (
    <aside className={`border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md flex flex-col h-full select-none shrink-0 z-20 transition-all duration-300 ease-in-out overflow-hidden ${
      leftSidebarOpen ? 'w-[260px]' : 'w-0 border-r-0'
    }`}>
      {/* File Explorer Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">{t.explorer}</span>
          <Folder className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="flex items-center gap-2 p-2 text-indigo-750 dark:text-indigo-400 text-sm font-semibold rounded-lg bg-indigo-500/5 border border-indigo-500/10 dark:border-indigo-500/25">
            <Folder className="w-4 h-4" />
            <span className="truncate">{currentWorkspace?.name}</span>
          </div>
          
          <div className="pl-4 space-y-1 mt-1">
            <div className="flex items-center justify-between p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg text-xs cursor-pointer group">
              <div className="flex items-center gap-2 truncate">
                <FileJson className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span className="truncate">{t.workspaceJson}</span>
              </div>
              <span className="text-[10px] px-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-500 rounded font-mono group-hover:text-slate-700 dark:group-hover:text-slate-400 transition-colors">
                {t.workspaceConfig}
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg text-xs cursor-pointer">
              <Folder className="w-3.5 h-3.5 text-slate-450 dark:text-slate-600" />
              <span className="truncate">diagrams/</span>
            </div>
            
            <div className="pl-4 text-[11px] text-slate-450 dark:text-slate-500 italic py-1">
              {t.noDiagrams}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-200 dark:bg-slate-800" />

      {/* Library Asset Panel — Click to pick, then click on canvas to place */}
      <div className="h-[460px] flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="p-3 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">{t.library}</span>
          <Boxes className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          
          {/* Section A: Standard Components */}
          <div className="space-y-2">
            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
              {language === 'tr' ? 'Varsayılan Bileşenler' : 'Standard Components'}
            </div>
            
            <div className="space-y-2">
              {libraryComponents.map((comp) => (
                <div
                  key={comp.type}
                  onMouseDown={() => handleMouseDown(comp.type, comp.defaultName)}
                  className={`p-2.5 border rounded-xl flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all group
                    ${pendingDrop?.type === comp.type 
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-500/40 shadow-md ring-2 ring-indigo-500/30' 
                      : 'bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-850 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 hover:shadow-sm hover:scale-[0.99]'
                    }`}
                >
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform">
                    {comp.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {comp.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-200/60 dark:bg-slate-800" />

          {/* Section B: Custom Components */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pl-1">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {language === 'tr' ? 'Özel Tasarımlar' : 'Custom Components'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleImportComponent}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-650 cursor-pointer"
                  title={language === 'tr' ? 'Bileşen İçe Aktar (.json)' : 'Import Component (.json)'}
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCreateNewCustomComponent}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                  title={language === 'tr' ? 'Yeni Tasarla' : 'Design New'}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {libraryComponentsList.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl text-center text-[10px] text-slate-400 dark:text-slate-500 italic leading-relaxed">
                  {language === 'tr' 
                    ? 'Henüz özel bileşen yok. Tasarlamak için "+" ikonuna tıklayın.' 
                    : 'No custom components yet. Click "+" to design.'}
                </div>
              ) : (
                libraryComponentsList.map((comp: CustomComponentTemplate) => (
                  <div
                    key={comp.componentId}
                    onMouseDown={() => startDrag(comp.componentId, comp.name)}
                    className={`p-2.5 border rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing transition-all group
                      ${pendingDrop?.type === comp.componentId 
                        ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-500/40 shadow-md ring-2 ring-indigo-500/30' 
                        : 'bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-850 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 hover:shadow-sm hover:scale-[0.99]'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 group-hover:scale-105 transition-all overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                        <CustomSvgRenderer 
                          layers={comp.layers} 
                          width={comp.dimensions.width} 
                          height={comp.dimensions.height} 
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-350 truncate">
                        {comp.name}
                      </span>
                    </div>

                    <div 
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2"
                      onMouseDown={(e) => e.stopPropagation()} // Prevent initiating drag when clicking action buttons
                    >
                      <button
                        onClick={() => handleEditComponent(comp)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 cursor-pointer"
                        title="Düzenle"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleExportComponent(comp)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 cursor-pointer"
                        title="Dışa Aktar"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteComponent(comp.componentId)}
                        className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </aside>
  );
};
