import React, { useEffect, useRef } from 'react';
import { Terminal, Activity, ArrowRight, ArrowRightLeft, CornerDownRight, Server, Layers, Trash2, Pencil } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { NodeRegistry } from '../../registry/NodeRegistry';

/**
 * SimulationPanel
 *
 * Displays the Simulation Flow Log and Diagram Components list in a compact, space-efficient layout.
 */
export const SimulationPanel: React.FC = () => {
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const language = useAppStore((s) => s.language);
  const activeSequenceIds = useAppStore((s) => s.activeSequenceIds);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);
  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const setFocusedNodeId = useAppStore((s) => s.setFocusedNodeId);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const schedules = useAppStore((s) => s.schedules);
  const deleteNode = useAppStore((s) => s.deleteNode);
  const openConfirm = useAppStore((s) => s.openConfirm);
  const setActiveNodeProperties = useAppStore((s) => s.setActiveNodeProperties);
  const setActiveEdgeProperties = useAppStore((s) => s.setActiveEdgeProperties);
  const openRightSidebar = useAppStore((s) => s.openRightSidebar);
  const clearActiveProperties = useAppStore((s) => s.clearActiveProperties);

  const activeRowRef = useRef<HTMLDivElement>(null);

  const sortedSequences = [...logicalData.sequences].sort((a, b) => {
    if (a.stepNumber !== b.stepNumber) return a.stepNumber - b.stepNumber;
    return a.id.localeCompare(b.id);
  });

  const activeIdsString = activeSequenceIds.join(',');
  useEffect(() => {
    if (activeSequenceIds.length > 0 && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIdsString]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full min-h-0 select-none font-sans">

      {/* ── TOP: Simulation Flow Log ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200 dark:border-slate-800">
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {language === 'tr' ? 'Akış Logu' : 'Flow Log'}
          </span>
          <Terminal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 bg-slate-50/20 dark:bg-slate-950/20 min-h-0">
          {sortedSequences.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-3">
              <Activity className="w-6 h-6 text-slate-350 dark:text-slate-500 stroke-[1.5] mb-1.5 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {language === 'tr' ? 'Log Bekleniyor' : 'Awaiting Logs'}
              </span>
              <p className="text-[9px] text-slate-400 dark:text-slate-550 max-w-[180px] mt-0.5 leading-tight">
                {language === 'tr'
                  ? 'Bağlantı oluşturun ve simülasyonu başlatın.'
                  : 'Add connections and start simulation.'}
              </p>
            </div>
          ) : (
            sortedSequences.map((seq) => {
              const edge = logicalData.edges.find((e) => e.id === seq.edgeId);
              if (!edge) return null;

              const src = logicalData.nodes.find((n) => n.id === edge.sourceId)?.name ?? edge.sourceId;
              const dst = logicalData.nodes.find((n) => n.id === edge.targetId)?.name ?? edge.targetId;
              const protocol = edge.protocol ?? 'Call';
              const isRowActive = activeSequenceIds.includes(seq.id);
              const isRowSelected = selectedSequenceId === seq.id;
              const timing = visualData.timelines[seq.id];
              const hasProcess = !!timing?.internalProcess;
              const sched = schedules[seq.id];

              return (
                <div
                  key={seq.id}
                  ref={isRowActive ? activeRowRef : null}
                  onClick={() => {
                    if (isPlaying) return;
                    setSelectedSequenceId(seq.id);
                  }}
                  className={`p-2 rounded-xl border transition-all duration-150 flex flex-col gap-1 ${
                    isPlaying ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                  } ${
                    isRowActive
                      ? 'bg-emerald-500/10 border-emerald-500/35 dark:bg-emerald-500/5 ring-1 ring-emerald-500/20'
                      : isRowSelected
                      ? 'bg-indigo-500/10 border-indigo-500/35 dark:bg-indigo-500/5 ring-1 ring-indigo-500/20'
                      : `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 ${isPlaying ? '' : 'hover:border-slate-300 dark:hover:border-slate-700'}`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded ${
                        isRowActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        S{seq.stepNumber}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {seq.isAsync ? 'Async' : 'Sync'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {sched && (
                        <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500">
                          {sched.start}-{sched.end}ms
                        </span>
                      )}
                      {!isPlaying && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSequenceId(seq.id);
                            const ve = visualData.layoutEdges[edge.id];
                            setActiveEdgeProperties({
                              id: edge.id,
                              protocol: edge.protocol ?? 'Call',
                              isAsync: edge.isAsync,
                              stepNumber: seq.stepNumber ?? 1,
                              duration: timing?.duration ?? 1000,
                              delay: timing?.delay ?? 0,
                              tooltipText: timing?.internalProcess?.text ?? '',
                              tooltipDuration: timing?.internalProcess?.duration ?? 1000,
                              description: edge.description ?? '',
                              particleType: ve?.particleType ?? 'dot',
                              showArrow: ve?.showArrow ?? false,
                              color: ve?.color ?? '',
                              properties: edge.properties ?? {},
                            });
                            setActiveNodeProperties(null);
                            openRightSidebar();
                          }}
                          className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          title={language === 'tr' ? 'Düzenle' : 'Edit'}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                    <span className="truncate max-w-[75px]">{src}</span>
                    <div className="flex flex-col items-center flex-1 min-w-[24px]">
                      <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 leading-none">({protocol})</span>
                      {seq.isRoundTrip ? (
                        <ArrowRightLeft className={`w-3 h-3 ${isRowActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                      ) : (
                        <ArrowRight className={`w-3 h-3 ${isRowActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                      )}
                    </div>
                    <span className="truncate max-w-[75px] text-right">{dst}</span>
                  </div>

                  {hasProcess && (
                    <div className="flex items-center gap-1 text-[8px] text-slate-400 dark:text-slate-500 font-medium pl-1 border-l border-slate-200 dark:border-slate-800">
                      <CornerDownRight className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{timing.internalProcess?.text} ({timing.internalProcess?.duration}ms)</span>
                    </div>
                  )}

                  {edge.description && (
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 pl-1 border-l border-slate-200 dark:border-slate-800 leading-tight truncate">
                      {edge.description}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── BOTTOM: Diagram Components ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {language === 'tr' ? 'Bileşenler' : 'Components'}
          </span>
          <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        </div>

        <div className="flex-1 overflow-y-auto p-2 pb-16 flex flex-col gap-1.5 bg-slate-50/20 dark:bg-slate-950/20 min-h-0">

          {logicalData.nodes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-3">
              <Server className="w-6 h-6 text-slate-350 dark:text-slate-500 stroke-[1.5] mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {language === 'tr' ? 'Bileşen Yok' : 'No Components'}
              </span>
              <p className="text-[9px] text-slate-400 dark:text-slate-550 max-w-[180px] mt-0.5 leading-tight">
                {language === 'tr'
                  ? 'Kütüphaneden bileşen sürükleyin.'
                  : 'Drag components from the sidebar.'}
              </p>
            </div>
          ) : (
            logicalData.nodes.map((node) => {
              const def = NodeRegistry[node.type];
              const icon = def?.icon ?? <Server className="w-3.5 h-3.5" />;
              const colorClass = def?.colorClass ?? 'text-indigo-500';
              const isSection = node.type === 'section';

              return (
                <div
                  key={node.id}
                  onClick={() => {
                    if (isPlaying) return;
                    setFocusedNodeId(node.id);
                  }}
                  className={`p-1.5 px-2 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all duration-150 flex items-center justify-between gap-2 group ${
                    isPlaying
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:bg-indigo-500/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`p-1 rounded-lg bg-slate-50 dark:bg-slate-950 shrink-0 ${colorClass}`}>
                      {React.cloneElement(icon as React.ReactElement, { className: 'w-3.5 h-3.5' } as any)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {node.name}
                      </span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">
                        {isSection
                          ? (language === 'tr' ? 'Alan' : 'Section')
                          : (def?.name[language] ?? node.type)}
                      </span>
                    </div>
                  </div>
                  {!isPlaying && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (node.type === 'sticky_note') {
                            clearActiveProperties();
                            const ev = new CustomEvent('canvas:editStickyNote', { detail: { id: node.id } });
                            window.dispatchEvent(ev);
                            return;
                          }

                          const vn = visualData.layoutNodes[node.id];
                          setActiveNodeProperties({
                            id: node.id,
                            name: node.name,
                            type: node.type,
                            theme: vn?.theme ?? 'white',
                            handles: vn?.handles,
                            displayMode: vn?.displayMode ?? 'default',
                            rotation: vn?.rotation ?? 0,
                            customStyles: vn?.customStyles ?? {},
                            properties: node.properties ?? {},
                          });
                          setActiveEdgeProperties(null);
                          openRightSidebar();
                        }}
                        className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
                        title={language === 'tr' ? 'Düzenle' : 'Edit'}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmMsg = language === 'tr'
                            ? `"${node.name}" bileşenini silmek istediğinize emin misiniz?`
                            : `Are you sure you want to delete "${node.name}"?`;
                          const confirmed = await openConfirm({
                            title: language === 'tr' ? 'Bileşeni Sil' : 'Delete Component',
                            message: confirmMsg,
                            type: 'danger',
                            confirmText: language === 'tr' ? 'Sil' : 'Delete',
                            cancelText: language === 'tr' ? 'İptal' : 'Cancel'
                          });
                          if (confirmed) {
                            deleteNode(node.id);
                          }
                        }}
                        className="p-1 rounded text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer"
                        title={language === 'tr' ? 'Sil' : 'Delete'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
