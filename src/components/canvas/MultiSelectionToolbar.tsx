import React, { memo } from 'react';
import {
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  BoxSelect,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface MultiSelectionToolbarProps {
  selectedNodeIds: string[];
  onClearSelection?: () => void;
}

export const MultiSelectionToolbar: React.FC<MultiSelectionToolbarProps> = memo(({
  selectedNodeIds,
  onClearSelection,
}) => {
  const language = useAppStore((s) => s.language);
  const alignSelectedNodes = useAppStore((s) => s.alignSelectedNodes);
  const distributeSelectedNodes = useAppStore((s) => s.distributeSelectedNodes);
  const packNodesIntoSection = useAppStore((s) => s.packNodesIntoSection);
  const deleteSelectedNodes = useAppStore((s) => s.deleteSelectedNodes);

  if (selectedNodeIds.length < 2) return null;

  const count = selectedNodeIds.length;
  const isTr = language === 'tr';

  const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    alignSelectedNodes(selectedNodeIds, alignment);
  };

  const handleDistribute = (direction: 'horizontal' | 'vertical') => {
    distributeSelectedNodes(selectedNodeIds, direction);
  };

  const handlePack = () => {
    packNodesIntoSection(selectedNodeIds);
  };

  const handleDelete = () => {
    deleteSelectedNodes(selectedNodeIds);
    onClearSelection?.();
  };

  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="nowheel nodrag nopan absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-black/10 animate-in fade-in slide-in-from-top-2 duration-200 select-none"
    >
      {/* Selection counter badge */}
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 mr-1 select-none">
        {count} {isTr ? 'seçili' : 'selected'}
      </span>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

      {/* Horizontal Alignments */}
      <button
        type="button"
        onMouseDown={handleButtonMouseDown}
        onPointerDown={handleButtonMouseDown}
        onClick={(e) => { e.stopPropagation(); handleAlign('left'); }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title={isTr ? 'Sola Hizala' : 'Align Left'}
      >
        <AlignStartVertical className="w-4 h-4" />
      </button>
      <button
        type="button"
        onMouseDown={handleButtonMouseDown}
        onPointerDown={handleButtonMouseDown}
        onClick={(e) => { e.stopPropagation(); handleAlign('center'); }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title={isTr ? 'Yatay Ortala' : 'Center Horizontally'}
      >
        <AlignCenterVertical className="w-4 h-4" />
      </button>
      <button
        type="button"
        onMouseDown={handleButtonMouseDown}
        onPointerDown={handleButtonMouseDown}
        onClick={(e) => { e.stopPropagation(); handleAlign('right'); }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title={isTr ? 'Sağa Hizala' : 'Align Right'}
      >
        <AlignEndVertical className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

      {/* Vertical Alignments */}
      <button
        type="button"
        onMouseDown={handleButtonMouseDown}
        onPointerDown={handleButtonMouseDown}
        onClick={(e) => { e.stopPropagation(); handleAlign('top'); }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title={isTr ? 'Üste Hizala' : 'Align Top'}
      >
        <AlignStartHorizontal className="w-4 h-4" />
      </button>
      <button
        type="button"
        onMouseDown={handleButtonMouseDown}
        onPointerDown={handleButtonMouseDown}
        onClick={(e) => { e.stopPropagation(); handleAlign('middle'); }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title={isTr ? 'Dikey Ortala' : 'Center Vertically'}
      >
        <AlignCenterHorizontal className="w-4 h-4" />
      </button>
      <button
        type="button"
        onMouseDown={handleButtonMouseDown}
        onPointerDown={handleButtonMouseDown}
        onClick={(e) => { e.stopPropagation(); handleAlign('bottom'); }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title={isTr ? 'Alta Hizala' : 'Align Bottom'}
      >
        <AlignEndHorizontal className="w-4 h-4" />
      </button>

      {/* Distribution (Requires 3+ nodes) */}
      {count >= 3 && (
        <>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onPointerDown={handleButtonMouseDown}
            onClick={(e) => { e.stopPropagation(); handleDistribute('horizontal'); }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isTr ? 'Yatay Eşit Dağıt' : 'Distribute Horizontally'}
          >
            <AlignHorizontalDistributeCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onPointerDown={handleButtonMouseDown}
            onClick={(e) => { e.stopPropagation(); handleDistribute('vertical'); }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isTr ? 'Dikey Eşit Dağıt' : 'Distribute Vertically'}
          >
            <AlignVerticalDistributeCenter className="w-4 h-4" />
          </button>
        </>
      )}

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

      {/* Pack into Section */}
      <button
        type="button"
        onMouseDown={handleButtonMouseDown}
        onPointerDown={handleButtonMouseDown}
        onClick={(e) => { e.stopPropagation(); handlePack(); }}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-semibold transition-colors cursor-pointer"
        title={isTr ? 'Seçilenleri Yeni Bölüme Al' : 'Pack Selected into Section'}
      >
        <BoxSelect className="w-4 h-4" />
        <span>{isTr ? 'Bölüm Yap' : 'Group Section'}</span>
      </button>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

      {/* Delete Selection */}
      <button
        type="button"
        onMouseDown={handleButtonMouseDown}
        onPointerDown={handleButtonMouseDown}
        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
        title={isTr ? 'Seçilenleri Sil' : 'Delete Selected'}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
});

MultiSelectionToolbar.displayName = 'MultiSelectionToolbar';
