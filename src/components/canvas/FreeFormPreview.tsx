import { memo } from 'react';
import { FreeFormContent } from '../../types';

interface FreeFormPreviewProps {
  content: FreeFormContent;
  nodeWidth: number;
  nodeHeight: number;
}

/**
 * Renders a read-only SVG preview of Excalidraw content inside a FreeForm node.
 * Uses the cached SVG string generated during save for zero-cost preview rendering.
 */
export const FreeFormPreview = memo(({ content, nodeWidth: _nodeWidth, nodeHeight }: FreeFormPreviewProps) => {
  const availableHeight = Math.max(0, nodeHeight);

  if (!content.svgCache) {
    return (
      <div 
        className="w-full flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs"
        style={{ height: availableHeight }}
      >
        No preview available
      </div>
    );
  }

  return (
    <div 
      className="w-full overflow-hidden flex items-center justify-center p-1 [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:object-contain"
      style={{ height: availableHeight }}
      dangerouslySetInnerHTML={{ __html: content.svgCache }}
    />
  );
});

FreeFormPreview.displayName = 'FreeFormPreview';
