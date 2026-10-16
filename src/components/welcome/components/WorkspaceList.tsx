import { FolderOpen, HardDrive, Pencil, Download, Trash2, RotateCcw } from 'lucide-react';
import type { WorkspaceMeta } from '../../../types';
import { translations } from '../../../i18n/translations';
import { useExperienceCopy } from '../../../i18n/useExperienceCopy';
import { formatWorkspaceDate } from '../../../i18n/formatters';
import { message } from '../../../i18n/messages';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { Menu } from '../../ui/Menu';
import { EmptyState } from '../../ui/EmptyState';

interface WorkspaceListProps {
  recentWorkspaces: WorkspaceMeta[]; loading: boolean; language: 'tr' | 'en'; needsPermission?: boolean;
  onGrantPermission?: () => void; onLoadRecent: (path: string) => void; onRenameWorkspace: (ws: WorkspaceMeta) => void;
  onExport: (ws: WorkspaceMeta) => void; onDelete: (ws: WorkspaceMeta) => void;
}
export function WorkspaceList({ recentWorkspaces,loading,language,needsPermission,onGrantPermission,onLoadRecent,onRenameWorkspace,onExport,onDelete }: WorkspaceListProps) {
  const t=translations[language],copy=useExperienceCopy();
  return <section className="yada-recent-workspaces" aria-labelledby="recent-workspaces-title">
    <header className="flex items-start justify-between gap-4">
      <div><h2 id="recent-workspaces-title">{copy.recentTitle}</h2><p>{copy.recentDescription}</p></div>
      <IconButton label={t.commonUi.refresh} disabled={loading} onClick={() => { void useAppStore.getState().fetchRecentWorkspaces(); }}><RotateCcw size={17} aria-hidden="true" /></IconButton>
    </header>
    {needsPermission && <div className="yada-permission-note">
      <HardDrive size={18} aria-hidden="true" /><span>{message(language,'WorkspaceList.localFolderYadaPermissionRequired')}</span>
      <Button onClick={onGrantPermission} disabled={loading}>{message(language,'WorkspaceList.grantAccess')}</Button>
    </div>}
    {!recentWorkspaces.length ? <EmptyState icon={<FolderOpen size={24} />} title={copy.noWorkspaces} description={copy.noWorkspacesDescription} /> : <ul className="yada-workspace-list">
      {recentWorkspaces.map(ws => <li key={ws.path}>
        <button type="button" className="yada-workspace-open" disabled={loading} onClick={() => onLoadRecent(ws.path)}>
          <span className="yada-workspace-icon" aria-hidden="true"><FolderOpen size={21} /></span>
          <span className="min-w-0"><span className="yada-workspace-name">{ws.name}</span><span className="yada-workspace-date yada-ui-data">{formatWorkspaceDate(ws,language)}</span></span>
        </button>
        <Menu label={copy.workspaceActions} locale={language === 'tr' ? 'tr-TR' : 'en'} disabled={loading} items={[
          {id:'rename',label:t.rename,icon:<Pencil />,onSelect:()=>onRenameWorkspace(ws)},
          {id:'export',label:t.exportDproj,icon:<Download />,onSelect:()=>onExport(ws)},
          {id:'delete',label:t.delete,icon:<Trash2 />,danger:true,onSelect:()=>onDelete(ws)},
        ]} />
      </li>)}
    </ul>}
  </section>;
}
