import React, { useCallback } from 'react';
import { Folder, FileJson, Boxes, Laptop, Network, Server, Database, Zap, ArrowRightLeft } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';

export const SidebarLeft: React.FC = () => {
  const { currentWorkspace, language, startDrag, pendingDrop, leftSidebarOpen } = useAppStore();
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
      <div className="h-[380px] flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="p-3 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">{t.library}</span>
          <Boxes className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {libraryComponents.map((comp) => (
            <div
              key={comp.type}
              onMouseDown={() => handleMouseDown(comp.type, comp.defaultName)}
              className={`p-3 border rounded-xl flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all group
                ${pendingDrop?.type === comp.type 
                  ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-500/40 shadow-md ring-2 ring-indigo-500/30' 
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 hover:shadow-sm hover:scale-[0.99]'
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
    </aside>
  );
};
