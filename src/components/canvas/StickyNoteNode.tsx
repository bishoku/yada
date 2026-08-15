import React from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { SimpleMarkdown } from './SimpleMarkdown';
import { useStickyNoteVisibility } from './hooks/useStickyNoteVisibility';

export const StickyNoteNode: React.FC<NodeProps> = ({ id, selected }) => {
  const isReadOnly = useAppStore((s) => s.isReadOnly);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const visualNode = useAppStore((s) => s.visualData.layoutNodes[id]);
  const annotation = useAppStore((s) => s.visualData.annotations?.[id]);
  const updateNodeDimensions = useAppStore((s: any) => s.updateNodeDimensions);
  const pushToHistory = useAppStore((s: any) => s.pushToHistory);
  const { isVisible, opacity } = useStickyNoteVisibility(id);

  const canvasRenderStyle = useAppStore((s: any) => s.visualData?.canvas?.renderStyle || 'clean');
  const isSketchy = canvasRenderStyle === 'sketchy';

  if (!visualNode || !annotation) return null;

  const noteStyle = annotation.style || {};

  // Render order and positioning
  const style = {
    backgroundColor: noteStyle.backgroundColor || '#0f172a',
    borderColor: noteStyle.borderColor || '#6366f1',
    color: noteStyle.textColor || '#e2e8f0',
    fontFamily: isSketchy ? 'var(--font-sketchy), Caveat, cursive' : (noteStyle.fontFamily || 'Inter'),
    fontSize: isSketchy ? `${(noteStyle.fontSize || 12) * 1.15}px` : `${noteStyle.fontSize || 12}px`,
    borderRadius: `${noteStyle.borderRadius || 8}px`,
    opacity: opacity,
    boxShadow: noteStyle.shadow !== false ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
    transition: 'opacity 0.2s ease-in-out',
    pointerEvents: isVisible ? 'auto' : 'none',
  } as React.CSSProperties;

  return (
    <>
      <div 
        className={`w-full h-full flex flex-col overflow-hidden border-2 relative
          ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        `}
        style={style}
        onDoubleClick={() => {
          if (!isReadOnly && !isPlaying) {
            // Open editor modal by dispatching custom event or calling store
            const ev = new CustomEvent('canvas:editStickyNote', { detail: { id } });
            window.dispatchEvent(ev);
          }
        }}
      >
        {annotation.header && (
          <div 
            className="px-3 py-2 font-semibold border-b shrink-0 flex items-center"
            style={{ 
              backgroundColor: noteStyle.headerColor || 'rgba(0,0,0,0.05)',
              borderColor: noteStyle.borderColor || '#6366f1'
            }}
          >
            {annotation.header}
          </div>
        )}

        <div className="flex-1 p-3 overflow-y-auto">
          <SimpleMarkdown text={annotation.body} />
        </div>
        
        {/* Decorative folded corner */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4"
          style={{
            background: `linear-gradient(to top left, transparent 50%, rgba(0,0,0,0.1) 50%)`,
            borderTopLeftRadius: '4px'
          }}
        />
      </div>

      {!isReadOnly && !isPlaying && selected && (
        <NodeResizer 
          color="#3b82f6" 
          isVisible={true} 
          minWidth={100} 
          minHeight={100}
          onResizeStart={() => pushToHistory()}
          onResizeEnd={(_, params) => {
            updateNodeDimensions(id, Math.round(params.width), Math.round(params.height));
          }}
        />
      )}
    </>
  );
};
