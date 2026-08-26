import React, { memo, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeResizer, useConnection } from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { PenTool, Edit3 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { resolveHandles, getHandleStyle } from '../../utils/portUtils';
import { FreeFormEditorModal } from './FreeFormEditorModal';
import { getRoughRoundedRectPaths, getNumericSeed } from './utils/roughGenerators';
import type { FreeFormContent, PortSide } from '../../types';

const sideToPosition = (side: PortSide): Position => {
  switch (side) {
    case 'top': return Position.Top;
    case 'right': return Position.Right;
    case 'bottom': return Position.Bottom;
    case 'left': return Position.Left;
  }
};

interface FreeFormNodeProps {
  id: string;
  data: { name: string; type: string };
  selected?: boolean;
}

export const FreeFormNode = memo(({ id, data, selected }: FreeFormNodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const visualNode = useAppStore((s: any) => s.visualData.layoutNodes[id]);
  const freeformContent = visualNode?.freeformContent ?? null;
  const updateFreeformContent = useAppStore((s: any) => s.updateFreeformContent);
  const isReadOnly = useAppStore((s: any) => s.isReadOnly);
  const isPlaying = useAppStore((s: any) => s.isPlaying);
  const language = useAppStore((s: any) => s.language);
  
  const canvasRenderStyle = useAppStore((s: any) => s.visualData?.canvas?.renderStyle || 'clean');
  const isSketchy = canvasRenderStyle === 'sketchy';

  // Handle system — matches BaseNode pattern exactly (with useShallow to avoid infinite loop)
  const nodeHandles = useAppStore((s: any) => s.visualData.layoutNodes[id]?.handles);
  const connectedHandlesArray = useAppStore(
    useShallow((s: any) => {
      const ports = new Set<string>();
      (s.logicalData.edges || []).forEach((e: any) => {
        const ve = s.visualData.layoutEdges?.[e.id];
        if (e.sourceId === id && ve?.sourceHandle) ports.add(ve.sourceHandle);
        if (e.targetId === id && ve?.targetHandle) ports.add(ve.targetHandle);
      });
      return Array.from(ports).sort();
    })
  );
  const connectedHandles = useMemo(() => new Set(connectedHandlesArray), [connectedHandlesArray]);
  const handles = useMemo(() => resolveHandles(nodeHandles), [nodeHandles]);

  // Connection state (for showing handles during edge creation)
  const connection = useConnection();
  const isConnecting = !!connection.inProgress;

  const handleSave = useCallback((content: FreeFormContent) => {
    updateFreeformContent(id, content);
    setIsEditing(false);
  }, [id, updateFreeformContent]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly && !isPlaying) {
      setIsEditing(true);
    }
  }, [isReadOnly, isPlaying]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly && !isPlaying) {
      setIsEditing(true);
    }
  }, [isReadOnly, isPlaying]);

  // Sketchy background
  const seed = useMemo(() => getNumericSeed(id), [id]);
  const width = visualNode?.width || 320;
  const height = visualNode?.height || 220;
  
  const roughPaths = useMemo(() => {
    if (!isSketchy) return null;
    return getRoughRoundedRectPaths(0, 0, width, height, 12, {
      seed,
      roughness: 1.2,
      bowing: 0.5,
    });
  }, [isSketchy, width, height, seed]);

  const canEdit = !isReadOnly && !isPlaying;
  const activeHandle = selected || isConnecting;
  const sizeClass = activeHandle ? '!w-4 !h-4' : '!w-2.5 !h-2.5';

  // SVG preview from cached SVG
  const svgPreview = freeformContent?.svgCache;
  const hasContent = freeformContent && freeformContent.elements && freeformContent.elements.length > 0;

  return (
    <>
      <NodeResizer 
        color="#8b5cf6" 
        isVisible={selected && !isReadOnly && !isPlaying} 
        minWidth={150} 
        minHeight={100} 
      />

      {/* Connection handles — at fragment root level (outside card div), matching BaseNode */}
      {handles.map((h) => {
        const pos = sideToPosition(h.side);
        const posStyle = getHandleStyle(h.side, h.offset);
        const isConnected = connectedHandles.has(h.id);
        const handleClass = isConnected ? 'handle-connected' : 'handle-idle';

        return (
          <React.Fragment key={h.id}>
            <Handle
              type="target"
              position={pos}
              id={`${h.id}-target`}
              style={{ ...posStyle, opacity: 0 }}
              className={`${sizeClass} !border-0 !bg-transparent ${handleClass}`}
            />
            <Handle
              type="source"
              position={pos}
              id={`${h.id}-source`}
              style={{
                ...posStyle,
                pointerEvents: isConnecting ? 'none' : 'auto',
                backgroundColor: '#8b5cf6',
                ['--handle-glow-color' as any]: '#8b5cf6',
              }}
              className={`${sizeClass} !border-2 !border-white dark:!border-slate-900 !transition-all !duration-150 ${handleClass}`}
            />
          </React.Fragment>
        );
      })}

      {/* Node card */}
      <div 
        className={`group relative w-full h-full flex flex-col rounded-xl border-2 transition-shadow bg-white dark:bg-slate-900 overflow-hidden
          ${isSketchy ? 'border-transparent bg-transparent dark:bg-transparent' : 'border-violet-400/50'}
          ${selected ? 'ring-2 ring-violet-500/30 shadow-md' : 'shadow-sm hover:shadow-md'}
        `}
        onDoubleClick={handleDoubleClick}
      >
        {isSketchy && roughPaths && (
          <div className="absolute inset-0 pointer-events-none -z-10">
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
              {roughPaths.fillPath && <path d={roughPaths.fillPath} className="fill-white dark:fill-slate-900" fillRule="evenodd" />}
              {roughPaths.strokePath && <path d={roughPaths.strokePath} className="stroke-violet-400/50" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
            </svg>
          </div>
        )}

        {/* Header */}
        <div className="h-8 flex items-center justify-between px-3 border-b border-violet-100 dark:border-violet-900/30 bg-violet-50/50 dark:bg-violet-900/10 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <PenTool className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
              {data.name || 'FreeForm'}
            </span>
          </div>
          {canEdit && (
            <button 
              onClick={handleEditClick}
              className={`p-1 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-800/50 transition-colors
                ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              `}
              title={language === 'tr' ? 'Çizimi Düzenle' : 'Edit Drawing'}
            >
              <Edit3 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {hasContent && svgPreview ? (
            <div 
              className="w-full h-full flex items-center justify-center p-2"
              dangerouslySetInnerHTML={{ __html: svgPreview }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-violet-50/30 dark:bg-violet-900/5 text-violet-400/60 dark:text-violet-400/40 cursor-pointer">
              <PenTool className="w-8 h-8 opacity-50" />
              <span className="text-xs font-medium opacity-80">
                {language === 'tr' ? 'Çizim için çift tıklayın' : 'Double-click to draw'}
              </span>
            </div>
          )}
        </div>
      </div>

      {isEditing && createPortal(
        <FreeFormEditorModal
          nodeId={id}
          nodeName={data.name || 'FreeForm'}
          initialContent={freeformContent}
          onSave={handleSave}
          onClose={() => setIsEditing(false)}
        />,
        document.body
      )}
    </>
  );
});

FreeFormNode.displayName = 'FreeFormNode';
