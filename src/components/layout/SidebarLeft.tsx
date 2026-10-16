import { Tabs } from '../ui/Tabs';
import { Input } from '../ui/Field';
import { IconButton } from '../ui/IconButton';
import { useExperienceCopy } from '../../i18n/useExperienceCopy';
import { useUiCopy } from '../../i18n/useUiCopy';
import { message } from '../../i18n/messages';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Boxes, Plus, Download, Upload, Edit, Trash2, Search, X
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { open, save } from '@tauri-apps/plugin-dialog';
import { StorageService, isTauri } from '../../services/storage';
import { CustomComponentTemplate } from '../../types';
import { CustomSvgRenderer } from '../canvas/CustomSvgRenderer';
import { NodeRegistry } from '../../registry/NodeRegistry';
import { SidebarDiagrams } from '../sidebar/SidebarDiagrams';
import { getPlatformCapabilities } from '../../services/platformCapabilities';

export const SidebarLeft: React.FC<{ onPick?: () => void }> = ({ onPick }) => {
  const uiCopy = useUiCopy();
  const copy = useExperienceCopy();
  const [libraryTab,setLibraryTab] = useState('components');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusSearch = () => { setLibraryTab('components'); requestAnimationFrame(() => searchRef.current?.focus()); };
    window.addEventListener('sidebar:focusSearch',focusSearch);
    return () => window.removeEventListener('sidebar:focusSearch',focusSearch);
  }, []);
  const addAtCenter = (type: string, name: string) => {
    window.dispatchEvent(new CustomEvent('canvas:addComponent', { detail: { type, name } }));
    onPick?.();
  };

  const language = useAppStore((s) => s.language);
  const startDrag = useAppStore((s) => s.startDrag);
  const pendingDrop = useAppStore((s) => s.pendingDrop);
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen);
  const openConfirm = useAppStore((s) => s.openConfirm);
  const openAlert = useAppStore((s) => s.openAlert);

  const libraryComponentsList = useAppStore((s: any) => s.libraryComponents);
  const setView = useAppStore((s: any) => s.setView);
  const setActiveComponent = useAppStore((s: any) => s.setActiveComponent);
  const deleteComponentFromLibrary = useAppStore((s: any) => s.deleteComponentFromLibrary);

  const [searchQuery, setSearchQuery] = useState('');

  const libraryComponents = Object.values(NodeRegistry)
    .filter(def => def.category !== 'custom')
    .map(def => ({
      type: def.type,
      name: language === 'tr' ? def.name.tr : def.name.en,
      defaultName: def.defaultName,
      icon: React.cloneElement(def.icon as React.ReactElement, { className: `w-4 h-4 ${def.colorClass}` } as any)
    }));

  const handleMouseDown = useCallback((type: string, defaultName: string) => {
    console.log('[SidebarLeft] mouseDown → startDrag:', type, defaultName);
    startDrag(type, defaultName);
  }, [startDrag]);

  const handleCreateNewCustomComponent = () => {
    const compId = `custom-comp-${Date.now()}`;
    const newComp: CustomComponentTemplate = {
      componentId: compId,
      name: message(language, "SidebarLeft.customComponent"),
      category: 'Custom',
      dimensions: { width: 200, height: 200 },
      layers: [],
      createdAt: new Date().toISOString()
    };
    setActiveComponent(newComp);
    setView('studio');
  };

  const processImportedContent = async (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.componentId && parsed.name && Array.isArray(parsed.layers)) {
        const dirPath = await StorageService.get_global_components_dir();
        const targetPath = `${dirPath}/${parsed.componentId}.json`;
        await StorageService.save_text_file(targetPath, content);
        const state = useAppStore.getState() as any;
        await state.loadLibrary();
      } else {
        openAlert({
          title: message(language, "SidebarLeft.error"),
          message: message(language, "SidebarLeft.invalidComponentFileStructure")
        });
      }
    } catch (err) {
      console.error('Import parse error:', err);
      openAlert({
        title: message(language, "SidebarLeft.error"),
        message: message(language, "SidebarLeft.failedToParseComponentFile")
      });
    }
  };

  const handleImportComponent = async () => {
    try {
      if (isTauri()) {
        const selected = await open({
          directory: false,
          multiple: false,
          filters: [{ name: 'JSON Component', extensions: ['json'] }],
          title: message(language, "SidebarLeft.chooseComponentFile")
        });
        if (selected && typeof selected === 'string') {
          const content = await StorageService.read_text_file(selected);
          await processImportedContent(content);
        }
      } else {
        // Web Implementation: hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (re) => {
            if (re.target?.result) {
              await processImportedContent(re.target.result as string);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (err) {
      console.error('Import error:', err);
    }
  };

  const handleExportComponent = async (comp: CustomComponentTemplate) => {
    try {
      const content = JSON.stringify(comp, null, 2);
      if (isTauri()) {
        const savePath = await save({
          defaultPath: `${comp.name}.json`,
          filters: [{ name: 'JSON Component', extensions: ['json'] }],
          title: message(language, "SidebarLeft.saveComponentFile")
        });
        if (savePath) {
          await StorageService.save_text_file(savePath, content);
        }
      } else {
        // Web Implementation: download via blob
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${comp.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
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
    const confirmMsg = message(language, "SidebarLeft.areYouSureYouWantToDelete");
    const confirmed = await openConfirm({
      title: message(language, "SidebarLeft.deleteComponent"),
      message: confirmMsg,
      type: 'danger',
      confirmText: message(language, "SidebarLeft.delete"),
      cancelText: message(language, "SidebarLeft.cancel")
    });
    if (confirmed) {
      await deleteComponentFromLibrary(compId);
    }
  };

  const filteredStandard = libraryComponents.filter(comp =>
    comp.name.toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en').includes(searchQuery.toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en'))
  );

  const filteredCustom = libraryComponentsList.filter((comp: CustomComponentTemplate) =>
    comp.name.toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en').includes(searchQuery.toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en'))
  );

  const isEmbedMode =
    window.location.href.includes('embed=true') ||
    window.location.href.includes('embed=1') ||
    window.location.href.includes('mode=modal') ||
    window.location.href.includes('mode=embed') ||
    window.location.href.includes('integration=iframe') ||
    window.location.href.includes('embed_editor=true');

  const canBrowseDiagrams = !isEmbedMode && getPlatformCapabilities().canCreateDiagram;
  const componentContent = (
      <div className="flex-1 overflow-y-auto p-3 space-y-4">

        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
            {message(language, "SidebarLeft.standardComponents")}
          </div>

          <div className="space-y-1">
            {filteredStandard.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 dark:text-slate-500 italic text-center">
                {message(language, "SidebarLeft.noMatchingStandardComponents")}
              </div>
            ) : (
              filteredStandard.map((comp) => (
                <button type="button"
                  key={comp.type}
                  onMouseDown={event => { if (!onPick && event.button === 0) handleMouseDown(comp.type, comp.name); }}
                  onClick={event => { if (onPick || event.detail === 0) addAtCenter(comp.type, comp.name); }}
                  className={`w-full text-left px-2 py-1.5 border rounded-lg flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all group
                    ${pendingDrop?.type === comp.type
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-500/40 shadow-md ring-2 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-850 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 hover:shadow-sm hover:scale-[0.99]'
                    }`}
                >
                  <div className="p-1 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform">
                    {comp.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {comp.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="h-px bg-slate-200/60 dark:bg-slate-800" />

        <div className="space-y-1">
          <div className="flex items-center justify-between pl-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {message(language, "SidebarLeft.customComponents")}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleImportComponent}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-650 cursor-pointer"
                title={message(language, "SidebarLeft.importComponentJson")}
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCreateNewCustomComponent}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                title={message(language, "SidebarLeft.designNew")}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {filteredCustom.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl text-center text-xs text-slate-400 dark:text-slate-500 italic leading-relaxed">
                {searchQuery
                  ? (message(language, "SidebarLeft.noMatchingCustomComponentsFound"))
                  : (message(language, "SidebarLeft.noCustomComponentsYetClickToDesign"))}
              </div>
            ) : (
              filteredCustom.map((comp: CustomComponentTemplate) => (
                <div
                  key={comp.componentId}
                  onMouseDown={() => { if (!onPick) startDrag(comp.componentId, comp.name); }}
                  className={`px-2 py-1.5 border rounded-lg flex items-center justify-between cursor-grab active:cursor-grabbing transition-all group
                    ${pendingDrop?.type === comp.componentId
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-500/40 shadow-md ring-2 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-850 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 hover:shadow-sm hover:scale-[0.99]'
                    }`}
                >
                  <button type="button" className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    onClick={event => { if (onPick || event.detail === 0) addAtCenter(comp.componentId, comp.name); }}>
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 group-hover:scale-105 transition-all overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <CustomSvgRenderer
                        layers={comp.layers}
                        width={comp.dimensions.width}
                        height={comp.dimensions.height}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {comp.name}
                    </span>
                  </button>

                  <div
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleEditComponent(comp)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 cursor-pointer"
                      title={uiCopy.edit}
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleExportComponent(comp)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 cursor-pointer"
                      title={uiCopy.export}
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteComponent(comp.componentId)}
                      className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title={uiCopy.delete}
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
  );

  return (
    <aside className={`border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md flex flex-col h-full select-none shrink-0 z-20 transition-all duration-300 ease-in-out overflow-hidden ${
      leftSidebarOpen ? 'w-[260px]' : 'w-0 border-r-0'
    }`}>
      <div className="p-3 border-b border-slate-200 dark:border-slate-850 flex flex-col gap-2 shrink-0 bg-slate-50/20 dark:bg-slate-900/10">
        {!onPick && (<div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
            {copy.navigator}
          </span>
          <Boxes className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </div>)}
        {(libraryTab === 'components' || !canBrowseDiagrams) && <div className="yada-sidebar-search relative flex items-center mt-0.5">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
          <Input ref={searchRef}
            aria-label={message(language, "SidebarLeft.searchComponents")}
            type="search"
            placeholder={message(language, "SidebarLeft.searchComponents")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-12"
          />
          {searchQuery && (
            <IconButton label={copy.clearSearch}
              onClick={() => setSearchQuery('')}
              className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </IconButton>
          )}
        </div>}
      </div>

      {canBrowseDiagrams ? <Tabs label={copy.library} value={libraryTab} onChange={setLibraryTab} className="flex-1 overflow-hidden" panelClassName="flex-1 min-h-0 overflow-y-auto" items={[
        {id:'components',label:copy.components,content:componentContent},
        {id:'diagrams',label:copy.diagrams,content:<div className="p-3"><SidebarDiagrams /></div>},
      ]} /> : componentContent}
    </aside>
  );
};
