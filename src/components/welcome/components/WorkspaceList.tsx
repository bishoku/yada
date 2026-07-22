import React, { useState } from 'react';
import { 
  ChevronDown, Upload, FolderOpen, HardDrive, Edit, Download, Trash2, Info, Activity, Sparkles, ArrowRight, RotateCcw
} from 'lucide-react';
import { WorkspaceMeta } from '../../../types';
import { DiagramAdapter } from '../../../adapters/types';
import { translations } from '../../../i18n/translations';
import { SAMPLE_DIAGRAMS, SampleDiagramItem } from '../../../data/sampleDiagrams';
import { extractShareData } from '../../../utils/shareUtils';
import { useAppStore } from '../../../store/useAppStore';

interface WorkspaceListProps {
  recentWorkspaces: WorkspaceMeta[];
  loading: boolean;
  language: 'tr' | 'en';
  showImportMenu: boolean;
  setShowImportMenu: (show: boolean) => void;
  availableAdapters: DiagramAdapter[];
  needsPermission?: boolean;
  onGrantPermission?: () => void;
  onLoadRecent: (path: string) => void;
  onRenameWorkspace: (ws: WorkspaceMeta) => void;
  onExport: (ws: WorkspaceMeta) => void;
  onDelete: (ws: WorkspaceMeta) => void;
  onImportDproj: () => void;
  onSelectAdapter: (adapter: DiagramAdapter) => void;
}

export const WorkspaceList: React.FC<WorkspaceListProps> = ({
  recentWorkspaces,
  loading,
  language,
  showImportMenu,
  setShowImportMenu,
  availableAdapters,
  needsPermission,
  onGrantPermission,
  onLoadRecent,
  onRenameWorkspace,
  onExport,
  onDelete,
  onImportDproj,
  onSelectAdapter,
}) => {
  const t = translations[language];
  const [isSamplesOpen, setIsSamplesOpen] = useState(false);

  const formatPath = (fullPath: string) => {
    if (fullPath.length > 40) {
      return '...' + fullPath.substring(fullPath.length - 37);
    }
    return fullPath;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleSelectSample = async (sample: SampleDiagramItem) => {
    try {
      const payload = await extractShareData(sample.encodedData);
      if (payload.logicalData && payload.visualData) {
        if (payload.currentView) {
          useAppStore.getState().setView(payload.currentView);
        }
        const title = language === 'tr' ? sample.name : sample.nameEn;
        useAppStore.getState().loadSharedDiagram(payload.logicalData, payload.visualData, title);
      }
    } catch (err) {
      console.error('Failed to load sample diagram:', err);
    }
  };

  return (
    <div className="w-full md:w-1/2 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full min-h-[550px]">
      {/* ── Top Area: Logo & Recent Workspaces ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="flex items-center gap-2 mb-5">
          <img src="pwa-icon.png" className="h-10 w-10" alt="YADA Icon" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-200 dark:via-indigo-100 dark:to-slate-200 bg-clip-text text-transparent">
            {t.welcomeTitle}
          </h1>
        </div>

        {/* ── Recent Workspaces Header ── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase tracking-wider">
            <span>{t.recentWorkspaces}</span>
            <button
              type="button"
              onClick={() => useAppStore.getState().fetchRecentWorkspaces()}
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title={language === 'tr' ? 'Yenile' : 'Refresh'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowImportMenu(!showImportMenu)}
                disabled={loading}
                className="text-xs px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors duration-200 font-semibold"
              >
                <Upload className="w-3.5 h-3.5" />
                {t.importDproj}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showImportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowImportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => {
                        setShowImportMenu(false);
                        onImportDproj();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import Workspace (.dproj)
                    </button>
                    {availableAdapters.map((adapter) => (
                      <button
                        key={adapter.id}
                        onClick={() => {
                          setShowImportMenu(false);
                          onSelectAdapter(adapter);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                      >
                        <Activity className="w-3.5 h-3.5 text-amber-500" />
                        Import {adapter.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Permission Grant Banner (File System Access Mode) ── */}
        {needsPermission && (
          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                {language === 'tr' ? 'Yerel klasöre (.yada) erişim izni verilmeli' : 'Local folder (.yada) permission required'}
              </div>
            </div>
            <button
              type="button"
              onClick={onGrantPermission}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              {language === 'tr' ? 'İzin Ver' : 'Grant Access'}
            </button>
          </div>
        )}

        {/* ── Recent Workspaces List ── */}
        {recentWorkspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <FolderOpen className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2" />
            <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold">{t.noWorkspaces}</p>
            <p className="text-slate-500 text-[11px] mt-0.5 max-w-[260px]">
              {t.noWorkspacesSub}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {recentWorkspaces.map((ws) => (
              <div
                key={ws.path}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950/40 hover:border-indigo-500/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl transition-all duration-200 group flex items-center justify-between"
              >
                <div
                  onClick={() => onLoadRecent(ws.path)}
                  className="flex-1 min-w-0 pr-2 cursor-pointer"
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-xs truncate">
                    {ws.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                    <HardDrive className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate" title={ws.path}>
                      {formatPath(ws.path)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right text-[9px] text-slate-400 hidden sm:block">
                    <div className="font-medium">{formatDate(ws.lastAccessed)}</div>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onRenameWorkspace(ws)}
                      title={t.rename}
                      disabled={loading}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onExport(ws)}
                      title={t.exportDproj}
                      disabled={loading}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(ws)}
                      title={t.delete}
                      disabled={loading}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/45 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Section: Sample Architecture Diagrams Drawer (Expands Upwards) ── */}
      <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col justify-end">
        {/* Sample Diagram Cards (Rendered ABOVE button when open) */}
        {isSamplesOpen && (
          <div className="mb-3 space-y-2 max-h-[240px] overflow-y-auto pr-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {SAMPLE_DIAGRAMS.map((sample) => (
              <div
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className="group relative p-3 bg-slate-50 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-xl transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {language === 'tr' ? sample.name : sample.nameEn}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border shrink-0 ${sample.badgeColor}`}>
                      {sample.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {language === 'tr' ? sample.description : sample.descriptionEn}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-1 flex-wrap">
                    {sample.tags.map((tag) => (
                      <span key={tag} className="text-[9px] text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                    <span>{language === 'tr' ? 'İncele' : 'Inspect'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Collapsible Header Button */}
        <button
          onClick={() => setIsSamplesOpen(!isSamplesOpen)}
          className="w-full flex items-center justify-between p-2 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 rounded-xl transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t.sampleDiagramsTitle || (language === 'tr' ? 'Örnek Mimari Diyagramlar' : 'Sample Architecture Diagrams')}</span>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-bold lowercase tracking-normal border border-indigo-500/20">
              {SAMPLE_DIAGRAMS.length} {language === 'tr' ? 'örnek' : 'samples'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              {isSamplesOpen 
                ? (language === 'tr' ? 'Daralt' : 'Collapse') 
                : (language === 'tr' ? 'Göster & Önizle' : 'Expand & Preview')}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSamplesOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Info Footer Note */}
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50 text-[11px] text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>{t.physicalStoreNote}</span>
        </div>
      </div>
    </div>
  );
};
