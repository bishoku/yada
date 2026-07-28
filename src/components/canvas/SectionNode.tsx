import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeResizer, useConnection } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { useSectionAnimation } from './hooks';
import { resolveHandles, getHandleStyle } from '../../utils/portUtils';
import { PortSide } from '../../types';

interface SectionNodeProps {
  id: string;
  data: {
    name: string;
    type: string;
  };
  selected?: boolean;
}

const sideToPosition = (side: PortSide): Position => {
  switch (side) {
    case 'top': return Position.Top;
    case 'right': return Position.Right;
    case 'bottom': return Position.Bottom;
    case 'left': return Position.Left;
  }
};

const themeStyles: Record<string, { border: string; bg: string; label: string; glow: string }> = {
  white: {
    border: 'border-slate-300/80 dark:border-slate-600/70',
    bg: 'bg-white/40 dark:bg-slate-900/40',
    label: 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
    glow: 'shadow-slate-200/50 dark:shadow-slate-700/30',
  },
  slate: {
    border: 'border-slate-400/60 dark:border-slate-500/50',
    bg: 'bg-slate-100/20 dark:bg-slate-800/15',
    label: 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600',
    glow: 'shadow-slate-200/50 dark:shadow-slate-700/30',
  },
  indigo: {
    border: 'border-indigo-400/50 dark:border-indigo-500/40',
    bg: 'bg-indigo-50/20 dark:bg-indigo-900/10',
    label: 'bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600',
    glow: 'shadow-indigo-200/50 dark:shadow-indigo-700/30',
  },
  emerald: {
    border: 'border-emerald-400/50 dark:border-emerald-500/40',
    bg: 'bg-emerald-50/20 dark:bg-emerald-900/10',
    label: 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600',
    glow: 'shadow-emerald-200/50 dark:shadow-emerald-700/30',
  },
  rose: {
    border: 'border-rose-400/50 dark:border-rose-500/40',
    bg: 'bg-rose-50/20 dark:bg-rose-900/10',
    label: 'bg-rose-100/80 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-600',
    glow: 'shadow-rose-200/50 dark:shadow-rose-700/30',
  },
  amber: {
    border: 'border-amber-400/50 dark:border-amber-500/40',
    bg: 'bg-amber-50/20 dark:bg-amber-900/10',
    label: 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-600',
    glow: 'shadow-amber-200/50 dark:shadow-amber-700/30',
  },
  violet: {
    border: 'border-violet-400/50 dark:border-violet-500/40',
    bg: 'bg-violet-50/20 dark:bg-violet-900/10',
    label: 'bg-violet-100/80 dark:bg-violet-900/60 text-violet-600 dark:text-violet-300 border-violet-300 dark:border-violet-600',
    glow: 'shadow-violet-200/50 dark:shadow-violet-700/30',
  },
  cyan: {
    border: 'border-cyan-400/50 dark:border-cyan-500/40',
    bg: 'bg-cyan-50/20 dark:bg-cyan-900/10',
    label: 'bg-cyan-100/80 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-300 border-cyan-300 dark:border-cyan-600',
    glow: 'shadow-cyan-200/50 dark:shadow-cyan-700/30',
  },
};

const PRESET_HEX: Record<string, string> = {
  white: '#ffffff',
  slate: '#64748b',
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
};

export const getContrastingTextColors = (bgColor: string) => {
  if (!bgColor) return null;
  let hex = bgColor.trim();

  // Handle rgb/rgba strings
  const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(hex);
  let r = 0, g = 0, b = 0;

  if (rgbMatch) {
    r = parseInt(rgbMatch[1], 10);
    g = parseInt(rgbMatch[2], 10);
    b = parseInt(rgbMatch[3], 10);
  } else {
    if (PRESET_HEX[hex]) {
      hex = PRESET_HEX[hex];
    }

    if (/^#([0-9a-f]{3})$/i.test(hex)) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }

    const hexMatch = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!hexMatch) return null;

    r = parseInt(hexMatch[1], 16);
    g = parseInt(hexMatch[2], 16);
    b = parseInt(hexMatch[3], 16);
  }

  // W3C Perceived Luminance formula (YIQ): (r*299 + g*587 + b*114) / 1000
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const isLight = yiq > 165;

  return {
    isLight,
    text: isLight ? '#0f172a' : '#ffffff',
  };
};

const hexToRgba = (hex: string, opacity: number): string => {
  let cleanHex = hex.trim();
  if (/^#([0-9a-f]{3})$/i.test(cleanHex)) {
    cleanHex = '#' + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2] + cleanHex[3] + cleanHex[3];
  }
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(cleanHex);
  if (!match) return `rgba(100, 116, 139, ${opacity})`;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const getCustomHexStyles = (hex: string, customBgOpacity?: number) => {
  let cleanHex = hex.trim();
  if (/^#([0-9a-f]{3})$/i.test(cleanHex)) {
    cleanHex = '#' + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2] + cleanHex[3] + cleanHex[3];
  }
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(cleanHex);
  if (!match) return null;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  const opacity = customBgOpacity ?? 0.10;

  return {
    borderStyle: {
      borderColor: `rgba(${r}, ${g}, ${b}, 0.5)`,
    },
    bgStyle: {
      backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
    },
    labelStyle: {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.20)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.4)`,
      color: `rgb(${r}, ${g}, ${b})`,
    },
    glowStyle: {
      boxShadow: `0 4px 20px rgba(${r}, ${g}, ${b}, 0.25)`,
    },
  };
};

export const SectionNode: React.FC<SectionNodeProps> = memo(({ id, data, selected }) => {
  const name = data?.name ?? 'Section';
  const visualNode = useAppStore((s: any) => s.visualData.layoutNodes[id]);
  const themeKey = visualNode?.theme ?? 'slate';
  const customStyles = visualNode?.customStyles ?? {};

  const updateNodeDimensions = useAppStore((s: any) => s.updateNodeDimensions);
  const nodeHandles = useAppStore((s: any) => {
    const ln = s.logicalData.nodes.find((n: any) => n.id === id);
    return ln?.handles;
  });
  
  const connection = useConnection();
  const isConnecting = !!connection.inProgress;

  const logicalData = useAppStore((s: any) => s.logicalData);
  const connectedHandles = useMemo(() => {
    const connected = new Set<string>();
    logicalData.edges.forEach((e: any) => {
      if (e.from === id) connected.add(e.fromPort);
      if (e.to === id) connected.add(e.toPort);
    });
    return connected;
  }, [logicalData.edges, id]);

  const handles = useMemo(() => resolveHandles(nodeHandles), [nodeHandles]);
  const isActive = useSectionAnimation(id);

  const customHex = useMemo(() => themeKey.startsWith('#') ? getCustomHexStyles(themeKey, customStyles.bgOpacity) : null, [themeKey, customStyles.bgOpacity]);
  const style = themeStyles[themeKey] ?? themeStyles.slate;

  // Custom visual options
  const titleMode = customStyles.sectionTitleMode ?? 'inline'; // 'inline' | 'header'
  const titleEdge = customStyles.sectionTitleEdge ?? 'top'; // 'top' | 'right' | 'bottom' | 'left'
  const titleAlign = customStyles.sectionTitleAlign ?? 'left'; // 'left' | 'center' | 'right'
  const borderType = customStyles.borderStyle ?? 'dashed'; // 'solid' | 'dashed' | 'dotted'

  const borderClass = borderType === 'solid' ? 'border-solid' : borderType === 'dotted' ? 'border-dotted' : 'border-dashed';

  const isVertical = titleEdge === 'left' || titleEdge === 'right';

  // Inline label positioning per edge
  const inlineLabelStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 10,
      whiteSpace: 'nowrap',
    };

    if (titleEdge === 'left') {
      // Bottom-to-top text
      base.writingMode = 'vertical-rl';
      base.transform =
        titleAlign === 'center' ? 'rotate(180deg) translateY(50%)' :
        titleAlign === 'right' ? 'rotate(180deg)' : 'rotate(180deg)';
      base.left = '-22px';
      base.top =
        titleAlign === 'center' ? '50%' :
        titleAlign === 'right' ? '12px' : 'auto';
      base.bottom =
        titleAlign === 'right' ? 'auto' : titleAlign === 'center' ? 'auto' : '12px';
    } else if (titleEdge === 'right') {
      // Top-to-bottom text
      base.writingMode = 'vertical-lr';
      base.right = '-22px';
      base.transform =
        titleAlign === 'center' ? 'translateY(-50%)' : 'none';
      base.top =
        titleAlign === 'center' ? '50%' :
        titleAlign === 'right' ? 'auto' : '12px';
      base.bottom = titleAlign === 'right' ? '12px' : 'auto';
    } else if (titleEdge === 'bottom') {
      base.bottom = '-22px';
      base.left =
        titleAlign === 'center' ? '50%' :
        titleAlign === 'right' ? 'auto' : '12px';
      base.right = titleAlign === 'right' ? '12px' : 'auto';
      base.transform = titleAlign === 'center' ? 'translateX(-50%)' : 'none';
    } else {
      // top (default)
      base.top = '-22px';
      base.left =
        titleAlign === 'center' ? '50%' :
        titleAlign === 'right' ? 'auto' : '12px';
      base.right = titleAlign === 'right' ? '12px' : 'auto';
      base.transform = titleAlign === 'center' ? 'translateX(-50%)' : 'none';
    }

    return base;
  }, [titleEdge, titleAlign]);

  // Inline label border-radius per edge
  const inlineBorderRadius = useMemo(() => {
    switch (titleEdge) {
      case 'bottom': return 'rounded-b-lg border border-t-0';
      case 'left': return 'rounded-r-lg border border-l-0'; // inverted: 180deg rotation flips it visually
      case 'right': return 'rounded-r-lg border border-l-0';
      default: return 'rounded-t-lg border border-b-0';
    }
  }, [titleEdge]);

  // Header banner flex direction & positioning
  const headerContainerClass = useMemo(() => {
    if (isVertical) {
      return 'flex-row'; // horizontal layout: sidebar + content
    }
    return 'flex-col'; // vertical layout: banner + content
  }, [isVertical]);

  const headerBannerStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {};

    if (titleEdge === 'left') {
      base.writingMode = 'vertical-rl';
      base.transform = 'rotate(180deg)';
      base.width = 'auto';
      base.minWidth = '28px';
      base.height = '100%';
    } else if (titleEdge === 'right') {
      base.writingMode = 'vertical-lr';
      base.width = 'auto';
      base.minWidth = '28px';
      base.height = '100%';
    }

    return base;
  }, [titleEdge]);

  // Header banner alignment
  const headerAlignClass = useMemo(() => {
    if (isVertical) {
      // vertical text alignment maps to vertical axis
      const align =
        titleAlign === 'center' ? 'justify-center' :
        titleAlign === 'right' ? 'justify-end' : 'justify-start';
      return `items-center ${align}`;
    }
    const align =
      titleAlign === 'center' ? 'justify-center text-center' :
      titleAlign === 'right' ? 'justify-end text-right' : 'justify-start text-left';
    return align;
  }, [titleAlign, isVertical]);

  // Header border edge
  const headerBorderClass = useMemo(() => {
    switch (titleEdge) {
      case 'bottom': return 'border-t border-inherit order-last';
      case 'left': return 'border-r border-inherit';
      case 'right': return 'border-l border-inherit order-last';
      default: return 'border-b border-inherit';
    }
  }, [titleEdge]);

  // Determine Border Color hex
  const borderHex = useMemo(() => {
    if (customStyles.borderColor) return customStyles.borderColor;
    if (themeKey.startsWith('#')) return themeKey;
    return PRESET_HEX[themeKey] ?? '#64748b';
  }, [customStyles.borderColor, themeKey]);

  // Determine Background Color hex
  const backgroundHex = useMemo(() => {
    if (customStyles.backgroundColor) {
      const bgVal = customStyles.backgroundColor;
      return bgVal.startsWith('#') ? bgVal : PRESET_HEX[bgVal] ?? '#64748b';
    }
    return themeKey.startsWith('#') ? themeKey : PRESET_HEX[themeKey] ?? '#64748b';
  }, [customStyles.backgroundColor, themeKey]);

  // Compute container background & inline styles
  const containerBgStyle = useMemo(() => {
    const res: React.CSSProperties = {};
    const opacity = customStyles.bgOpacity ?? 0.15;

    // Apply Background Fill Color & Opacity
    res.backgroundColor = hexToRgba(backgroundHex, opacity);

    // Apply Border Color explicitly from theme / border color selection
    res.borderColor = borderHex;

    if (isActive || selected) {
      const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(borderHex.length === 4 ? '#' + borderHex[1] + borderHex[1] + borderHex[2] + borderHex[2] + borderHex[3] + borderHex[3] : borderHex);
      if (match) {
        const r = parseInt(match[1], 16), g = parseInt(match[2], 16), b = parseInt(match[3], 16);
        res.boxShadow = `0 4px 20px rgba(${r}, ${g}, ${b}, 0.25)`;
      }
    }
    return res;
  }, [customStyles.bgOpacity, borderHex, backgroundHex, isActive, selected]);

  // Compute Header Banner background style & dynamic contrast text color
  const headerBannerComputedStyle = useMemo(() => {
    const res: React.CSSProperties = {};
    const effectiveHeaderBg = customStyles.headerBgColor || themeKey;
    const hexColor = effectiveHeaderBg.startsWith('#')
      ? effectiveHeaderBg
      : PRESET_HEX[effectiveHeaderBg] ?? '#64748b';

    res.backgroundColor = hexColor;

    const contrast = getContrastingTextColors(hexColor);
    if (contrast) {
      res.color = contrast.text;
    }

    return res;
  }, [customStyles.headerBgColor, themeKey]);

  return (
    <div className="relative w-full h-full font-sans">
      <NodeResizer 
        minWidth={200} 
        minHeight={150} 
        isVisible={!!selected} 
        lineClassName="border-indigo-500/50" 
        handleClassName="w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-full shadow-sm"
        onResizeEnd={(_, params) => {
          updateNodeDimensions(id, params.width, params.height);
        }}
      />

      {/* Inline Section Label */}
      {titleMode === 'inline' && (
        <div 
          className={`${inlineBorderRadius} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider 
                      z-10 select-none transition-all duration-200
                      ${customHex ? '' : style.label}`}
          style={{ ...inlineLabelStyle, ...(customHex ? customHex.labelStyle : {}) }}
        >
          {name}
        </div>
      )}

      {/* Section Container */}
      <div 
        className={`w-full h-full rounded-xl border-2 ${borderClass} backdrop-blur-[1px] transition-all duration-300 flex ${headerContainerClass} overflow-hidden
                    ${customHex ? '' : `${style.border} ${customStyles.backgroundColor ? '' : style.bg}`}
                    ${isActive 
                      ? 'ring-2 ring-emerald-500/30 dark:ring-emerald-400/20 border-emerald-500/60 dark:border-emerald-400/40 shadow-lg ' + (customHex ? '' : style.glow)
                      : selected 
                        ? 'ring-2 ring-indigo-500/20 shadow-md ' + (customHex ? '' : style.glow)
                        : ''
                    }`}
        style={containerBgStyle}
      >
        {/* Header Banner */}
        {titleMode === 'header' && (
          <div 
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider 
                        ${headerBorderClass} select-none overflow-hidden flex items-center z-10 shrink-0
                        ${headerAlignClass}
                        ${customStyles.headerBgColor || customHex ? '' : style.label}`}
            style={{ ...headerBannerComputedStyle, ...headerBannerStyle }}
          >
            {name}
          </div>
        )}

        {/* Content Body Area */}
        <div className="flex-1 w-full relative">
          {/* Child nodes are rendered by ReactFlow via parentId */}
        </div>
      </div>

      {/* Dynamic Connection Handles */}
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
              style={posStyle}
              className={`!w-3.5 !h-3.5 !border-2 !border-white dark:!border-slate-900 !bg-slate-400 dark:!bg-slate-500 hover:!bg-indigo-500 hover:!scale-125 !transition-all !rounded-full ${handleClass}`}
            />
            <Handle 
              type="source" 
              position={pos} 
              id={`${h.id}-source`}
              style={{ ...posStyle, pointerEvents: isConnecting ? 'none' : 'auto' }}
              className={`!w-3.5 !h-3.5 !border-2 !border-white dark:!border-slate-900 !bg-slate-400 dark:!bg-slate-500 hover:!bg-indigo-500 hover:!scale-125 !transition-all !rounded-full ${handleClass}`}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
});
