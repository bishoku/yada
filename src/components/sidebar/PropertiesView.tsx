import React, { useRef, useMemo } from 'react';
import { Settings, ChevronLeft, Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { HandleConfig } from '../../types';
import { NodePropertiesForm, NodePropertiesFormRef } from './properties/NodePropertiesForm';
import { EdgePropertiesForm, EdgePropertiesFormRef } from './properties/EdgePropertiesForm';

interface PropertiesViewProps {
  /** Returns to SimulationPanel */
  onBack: () => void;
  onApplyNode: (
    id: string, name: string, type: string, theme: string,
    handles?: HandleConfig[], displayMode?: 'default' | 'icon-only',
    rotation?: number, customStyles?: any
  ) => void;
  onApplyEdge: (
    id: string, protocol: string, isAsync: boolean, duration: number, delay: number,
    tooltipText: string, tooltipDuration: number, description: string,
    particleType: 'circle' | 'arrow' | 'envelope' | undefined,
    stepNumber: number, direction: 'forward' | 'reverse', isRoundTrip: boolean
  ) => void;
  onCancelEdge: () => void;
}

/**
 * PropertiesView — orchestration shell
 *
 * Single Responsibility: renders the header/footer chrome and mounts either
 * NodePropertiesForm or EdgePropertiesForm based on store selection state.
 * All form logic lives in the child components.
 */
export const PropertiesView: React.FC<PropertiesViewProps> = ({
  onBack,
  onApplyNode,
  onApplyEdge,
  onCancelEdge,
}) => {
  const language = useAppStore((s) => s.language);
  const logicalData = useAppStore((s) => s.logicalData);
  const maxSteps = useAppStore((s) => s.maxSteps);
  const activeNode = useAppStore((s) => s.activeNodeProperties);
  const activeEdge = useAppStore((s) => s.activeEdgeProperties);

  // Derive connected handle IDs for the active node
  const connectedHandleIds = useMemo(() => {
    if (!activeNode) return new Set<string>();
    const connected = new Set<string>();
    logicalData.edges.forEach((e) => {
      if (e.from === activeNode.id) connected.add(e.fromPort);
      if (e.to === activeNode.id) connected.add(e.toPort);
    });
    return connected;
  }, [activeNode, logicalData.edges]);

  // Derive sequence state for the active edge
  const activeEdgeSeq = useMemo(() => {
    if (!activeEdge) return null;
    return logicalData.sequences.find((s) => s.edgeId === activeEdge.id) ?? null;
  }, [activeEdge, logicalData.sequences]);

  // Refs to form imperative handles — footer Apply button calls .submit() on active form
  const nodeFormRef = useRef<NodePropertiesFormRef>(null);
  const edgeFormRef = useRef<EdgePropertiesFormRef>(null);

  if (!activeNode && !activeEdge) return null;

  const tr = (t: string, e: string) => language === 'tr' ? t : e;
  const isEdgeNew = activeEdge?.isNew ?? false;
  const panelTitle = activeNode
    ? tr('Bileşen Özellikleri', 'Component Properties')
    : tr('Bağlantı Özellikleri', 'Edge Properties');

  const handleApply = () => {
    if (activeNode) nodeFormRef.current?.submit();
    else edgeFormRef.current?.submit();
  };

  return (
    <div className="flex flex-col h-full min-h-0 select-none font-sans">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-2 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
        <button
          onClick={onBack}
          title={tr('Simülasyona dön', 'Back to simulation')}
          className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1 truncate">
          <Settings className="w-3 h-3 text-indigo-500 shrink-0" />
          {panelTitle}
        </span>
      </div>

      {/* ── Scrollable form body ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2.5">
        {activeNode && (
          <NodePropertiesForm
            ref={nodeFormRef}
            activeNode={activeNode}
            language={language}
            connectedHandleIds={connectedHandleIds}
            onSubmit={onApplyNode}
          />
        )}

        {activeEdge && (
          <EdgePropertiesForm
            ref={edgeFormRef}
            activeEdge={activeEdge}
            language={language}
            maxSteps={maxSteps}
            sequenceDirection={activeEdgeSeq?.direction ?? 'forward'}
            sequenceRoundTrip={activeEdgeSeq?.isRoundTrip ?? false}
            onSubmit={onApplyEdge}
          />
        )}
      </div>

      {/* ── Footer actions ──────────────────────────────────────────────────── */}
      <div className="px-2.5 py-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0 flex gap-1.5 justify-end bg-slate-50/50 dark:bg-slate-900/30">
        {isEdgeNew && (
          <button
            onClick={onCancelEdge}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            {tr('Sil', 'Discard')}
          </button>
        )}
        <button
          onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{tr('Uygula', 'Apply')}</span>
        </button>
      </div>
    </div>
  );
};
