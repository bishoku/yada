import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeResizer, useConnection } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '../../store/useAppStore';
import { CustomSvgRenderer } from './CustomSvgRenderer';
import { useNodeAnimation } from './hooks';
import { getNodeDefinition, getDefaultIcon } from '../../registry/NodeRegistry';
import { resolveHandles, getHandleStyle } from '../../utils/portUtils';
import { PortSide } from '../../types';
import { findDeviconItem, getDeviconComponent } from '../../registry/DeviconRegistry';

interface BaseNodeProps {
  id: string;
  data: { name: string; type: string };
  selected?: boolean;
}

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

const getThemeHexColor = (themeKey: string): string => {
  if (PRESET_HEX[themeKey]) return PRESET_HEX[themeKey];
  return themeKey; // custom hex color
};

/**
 * Calculates a visually distinct, harmonious border color derived from the background color
 * (22% darker shade for crisp definition and depth).
 */
export const getHarmoniousBorderColor = (bgColor: string) => {
  if (!bgColor) return undefined;
  let hex = bgColor.trim();

  if (PRESET_HEX[hex]) {
    hex = PRESET_HEX[hex];
  }

  if (/^#([0-9a-f]{3})$/i.test(hex)) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }

  const hexMatch = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!hexMatch) return undefined;

  const r = parseInt(hexMatch[1], 16);
  const g = parseInt(hexMatch[2], 16);
  const b = parseInt(hexMatch[3], 16);

  const darken = (c: number) => Math.max(0, Math.floor(c * 0.78));
  const dr = darken(r);
  const dg = darken(g);
  const db = darken(b);

  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(dr)}${toHex(dg)}${toHex(db)}`;
};

/**
 * Calculates perceived luminance of a background color and returns WCAG AAA compliant
 * contrast colors for primary text, subtext, icon, and vertical divider.
 */
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

  // Luminance threshold (165 out of 255)
  const isLight = yiq > 165;

  return {
    isLight,
    text: isLight ? '#0f172a' : '#ffffff',                           // Primary Title
    subtext: isLight ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.75)', // Subtext (Type / Category)
    iconColor: isLight ? '#0f172a' : '#ffffff',                       // Icon
    divider: isLight ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.25)', // Vertical divider
  };
};

const addOpacityToHex = (color: string, opacity: number) => {
  if (!color) return `rgba(99, 102, 241, ${opacity})`;
  let hex = color.trim();
  if (PRESET_HEX[hex]) hex = PRESET_HEX[hex];
  if (/^#([0-9a-f]{3})$/i.test(hex)) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return color;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const getIcon = (type: string, colorClass: string, isIconOnly: boolean, customColor?: string, iconPx?: number) => {
  const def = getNodeDefinition(type);
  const sizeClass = isIconOnly ? 'w-[80%] h-[80%]' : '';
  const targetColor = customColor || colorClass || def?.colorClass || 'text-indigo-500';
  const isHexOrColor = targetColor.startsWith('#') || targetColor.startsWith('rgb') || targetColor.startsWith('hsl');
  
  let className = `${sizeClass} transition-all duration-300`;
  let style: React.CSSProperties | undefined = (!isIconOnly && iconPx) ? { width: `${iconPx}px`, height: `${iconPx}px` } : undefined;

  if (!isIconOnly && !iconPx) {
    className += ' w-8 h-8';
  }

  if (isHexOrColor) {
    style = { ...style, color: targetColor, stroke: targetColor };
  } else if (themeStyles[targetColor]) {
    className += ` ${themeStyles[targetColor].text}`;
  } else {
    className += ` ${targetColor}`;
  }

  const extraProps = {
    className,
    style,
  };

  if (def && def.icon) {
    return React.cloneElement(def.icon as React.ReactElement, extraProps as any);
  }
  return React.cloneElement(getDefaultIcon(colorClass) as React.ReactElement, extraProps as any);
};

const sideToPosition = (side: PortSide): Position => {
  switch (side) {
    case 'top': return Position.Top;
    case 'right': return Position.Right;
    case 'bottom': return Position.Bottom;
    case 'left': return Position.Left;
  }
};

const themeStyles: Record<string, { border: string; borderHover: string; ring: string; text: string; bg: string; handleBg: string; resizerBorder: string; resizerHandleBorder: string }> = {
  slate: { border: 'border-slate-500 dark:border-slate-500/80', borderHover: 'hover:border-slate-600 dark:hover:border-slate-400', ring: 'ring-slate-500/10 dark:ring-slate-500/20 shadow-slate-100 dark:shadow-slate-950/40', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/5 dark:bg-slate-500/10', handleBg: '!bg-slate-500 dark:!bg-slate-400', resizerBorder: '!border-slate-500', resizerHandleBorder: '!border-slate-500' },
  indigo: { border: 'border-indigo-500 dark:border-indigo-500/80', borderHover: 'hover:border-indigo-600 dark:hover:border-indigo-400', ring: 'ring-indigo-500/10 dark:ring-indigo-500/20 shadow-indigo-100 dark:shadow-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/5 dark:bg-indigo-500/10', handleBg: '!bg-indigo-500 dark:!bg-indigo-400', resizerBorder: '!border-indigo-500', resizerHandleBorder: '!border-indigo-500' },
  emerald: { border: 'border-emerald-500 dark:border-emerald-500/80', borderHover: 'hover:border-emerald-600 dark:hover:border-emerald-400', ring: 'ring-emerald-500/10 dark:ring-emerald-500/20 shadow-emerald-100 dark:shadow-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5 dark:bg-emerald-500/10', handleBg: '!bg-emerald-500 dark:!bg-emerald-400', resizerBorder: '!border-emerald-500', resizerHandleBorder: '!border-emerald-500' },
  rose: { border: 'border-rose-500 dark:border-rose-500/80', borderHover: 'hover:border-rose-600 dark:hover:border-rose-400', ring: 'ring-rose-500/10 dark:ring-rose-500/20 shadow-rose-100 dark:shadow-rose-950/40', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/5 dark:bg-rose-500/10', handleBg: '!bg-rose-500 dark:!bg-rose-400', resizerBorder: '!border-rose-500', resizerHandleBorder: '!border-rose-500' },
  amber: { border: 'border-amber-500 dark:border-amber-500/80', borderHover: 'hover:border-amber-600 dark:hover:border-amber-400', ring: 'ring-amber-500/10 dark:ring-amber-500/20 shadow-amber-100 dark:shadow-amber-950/40', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/5 dark:bg-amber-500/10', handleBg: '!bg-amber-500 dark:!bg-amber-400', resizerBorder: '!border-amber-500', resizerHandleBorder: '!border-amber-500' },
  violet: { border: 'border-violet-500 dark:border-violet-500/80', borderHover: 'hover:border-violet-600 dark:hover:border-violet-400', ring: 'ring-violet-500/10 dark:ring-violet-500/20 shadow-violet-100 dark:shadow-violet-950/40', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/5 dark:bg-violet-500/10', handleBg: '!bg-violet-500 dark:!bg-violet-400', resizerBorder: '!border-violet-500', resizerHandleBorder: '!border-violet-500' },
  cyan: { border: 'border-cyan-500 dark:border-cyan-500/80', borderHover: 'hover:border-cyan-600 dark:hover:border-cyan-400', ring: 'ring-cyan-500/10 dark:ring-cyan-500/20 shadow-cyan-100 dark:shadow-cyan-950/40', text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/5 dark:bg-cyan-500/10', handleBg: '!bg-cyan-500 dark:!bg-cyan-400', resizerBorder: '!border-cyan-500', resizerHandleBorder: '!border-cyan-500' },
};

export const BaseNode: React.FC<BaseNodeProps> = memo(({ id, data, selected }) => {
  const name = data?.name ?? 'Node';
  const type = data?.type ?? 'server';

  const connection = useConnection();
  const isConnecting = !!connection.inProgress;

  const { tooltipActive: isProcessing, nodeActive: isNodeActive, tooltipText: activeTooltipText } = useNodeAnimation(id);

  const visualNode = useAppStore((s: any) => s.visualData.layoutNodes[id]);
  const themeKey = visualNode?.theme ?? 'white';
  const displayMode = visualNode?.displayMode ?? 'default';
  const isVertical = (visualNode?.rotation ?? 0) === 90;
  const customStyles = visualNode?.customStyles ?? {};

  const isBorderOnly = customStyles.borderOnly !== false;

  const updateNodeDimensions = useAppStore((s: any) => s.updateNodeDimensions);
  const libraryComponents = useAppStore((s: any) => s.libraryComponents);
  const nodeHandles = useAppStore((s: any) => s.visualData.layoutNodes[id]?.handles);

  const connectedHandlesArray = useAppStore(
    useShallow((s: any) => {
      const ports = new Set<string>();
      s.logicalData.edges.forEach((e: any) => {
        const ve = s.visualData.layoutEdges[e.id];
        if (e.sourceId === id && ve?.sourceHandle) ports.add(ve.sourceHandle);
        if (e.targetId === id && ve?.targetHandle) ports.add(ve.targetHandle);
      });
      return Array.from(ports).sort();
    })
  );

  const connectedHandles = useMemo(() => new Set(connectedHandlesArray), [connectedHandlesArray]);

  const handles = useMemo(() => resolveHandles(nodeHandles), [nodeHandles]);
  const style = themeStyles[themeKey] ?? themeStyles.indigo;
  const customTemplate = libraryComponents.find((c: any) => c.componentId === type);

  // Dimension and proportional scaling calculations
  const nodeWidth = visualNode?.width ?? (isVertical ? 52 : 224);
  const nodeHeight = visualNode?.height ?? (isVertical ? 224 : 52);

  const baseW = isVertical ? 52 : 224;
  const baseH = isVertical ? 224 : 52;
  const scale = useMemo(() => {
    return Math.max(0.5, Math.min(4.0, Math.min(nodeWidth / baseW, nodeHeight / baseH)));
  }, [nodeWidth, nodeHeight, baseW, baseH]);

  const iconBoxSize = Math.round(36 * scale);
  const iconPx = Math.round(30 * scale);
  const dividerH = Math.round(28 * scale);
  const titleFontSize = Math.max(8, Math.round(12 * scale));
  const subtitleFontSize = Math.max(7, Math.round(10 * scale));
  const cardPaddingX = Math.round(16 * scale);
  const cardPaddingY = Math.round(12 * scale);
  const cardGap = Math.round((isVertical ? 12 : 10) * scale);

  // The node background color is directly set from customStyles or the chosen component color
  const activeBgHex = useMemo(() => {
    return customStyles.backgroundColor || getThemeHexColor(themeKey);
  }, [customStyles.backgroundColor, themeKey]);

  // Calculate contrast colors dynamically from activeBgHex ONLY if solid fill
  const contrastColors = useMemo(() => {
    if (isBorderOnly) return null;
    return getContrastingTextColors(activeBgHex);
  }, [activeBgHex, isBorderOnly]);

  // Calculate border color: if borderOnly is true, activeBgHex is used directly as border stroke!
  const harmoniousBorder = useMemo(() => {
    if (customStyles.borderColor) return customStyles.borderColor;
    if (isBorderOnly) return activeBgHex;
    return getHarmoniousBorderColor(activeBgHex);
  }, [customStyles.borderColor, activeBgHex, isBorderOnly]);

  const iconLabelPos = customStyles.iconLabelPosition ?? 'none';

  let iconOnlyFlexClass = 'items-center justify-center';
  if (displayMode === 'icon-only') {
    switch (iconLabelPos) {
      case 'bottom': iconOnlyFlexClass = 'flex-col items-center justify-center gap-1'; break;
      case 'top': iconOnlyFlexClass = 'flex-col-reverse items-center justify-center gap-1'; break;
      case 'right': iconOnlyFlexClass = 'flex-row items-center justify-center gap-1.5'; break;
      case 'left': iconOnlyFlexClass = 'flex-row-reverse items-center justify-center gap-1.5'; break;
      default: iconOnlyFlexClass = 'items-center justify-center'; break;
    }
  }

  const containerStyle: React.CSSProperties = {
    backgroundColor: (displayMode === 'icon-only' || isBorderOnly) ? undefined : activeBgHex,
    borderColor: harmoniousBorder,
    borderStyle: customStyles.borderStyle || undefined,
    borderRadius: customStyles.borderRadius ? `${customStyles.borderRadius}px` : undefined,
    paddingLeft: displayMode === 'icon-only' ? 0 : `${cardPaddingX}px`,
    paddingRight: displayMode === 'icon-only' ? 0 : `${cardPaddingX}px`,
    paddingTop: displayMode === 'icon-only' ? 0 : `${cardPaddingY}px`,
    paddingBottom: displayMode === 'icon-only' ? 0 : `${cardPaddingY}px`,
    gap: `${cardGap}px`,
    ['--tw-ring-color' as any]: addOpacityToHex((activeBgHex === '#ffffff' || activeBgHex === 'white') ? '#6366f1' : activeBgHex, 0.5),
  };

  return (
    <div className="relative w-full h-full font-sans" style={{ overflow: 'visible' }}>

      <NodeResizer
        minWidth={isVertical ? 32 : 120}
        minHeight={isVertical ? 120 : 32}
        isVisible={!!selected}
        lineClassName={style.resizerBorder}
        lineStyle={{ borderColor: (isBorderOnly || contrastColors?.isLight) ? '#4f46e5' : activeBgHex }}
        handleClassName="w-2.5 h-2.5 rounded-full border-2 shadow-sm"
        handleStyle={{
          backgroundColor: (isBorderOnly || contrastColors?.isLight) ? '#4f46e5' : '#ffffff',
          borderColor: (isBorderOnly || contrastColors?.isLight) ? '#ffffff' : activeBgHex,
        }}
        onResizeEnd={(_, params) => {
          updateNodeDimensions(id, params.width, params.height);
        }}
      />

      {/* Tooltip Bubble */}
      {activeTooltipText && (
        <div className="absolute top-[-52px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-xl shadow-lg border border-indigo-500/30 whitespace-nowrap">
          <MessageSquare className="w-3.5 h-3.5 fill-white/10" />
          <span>{activeTooltipText}</span>
          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-indigo-600 rotate-45 border-r border-b border-indigo-500/30" />
        </div>
      )}

      {/* Connection handles */}
      {handles.map((h) => {
        const pos = sideToPosition(h.side);
        const posStyle = getHandleStyle(h.side, h.offset);
        const isConnected = connectedHandles.has(h.id);
        const handleClass = isConnected ? 'handle-connected' : 'handle-idle';
        const activeHandle = selected || isConnecting;
        const sizeClass = activeHandle ? '!w-4 !h-4' : '!w-2.5 !h-2.5';

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
                backgroundColor: activeBgHex,
                ['--handle-glow-color' as any]: activeBgHex,
              }}
              className={`${sizeClass} !border-2 ${
                (isBorderOnly || contrastColors?.isLight) ? '!border-slate-400 dark:!border-slate-600' : '!border-white dark:!border-slate-900'
              } !transition-all !duration-150 ${handleClass}`}
            />
          </React.Fragment>
        );
      })}

      {/* Node card */}
      <div
        style={containerStyle}
        className={`w-full h-full rounded-xl flex transition-all duration-200 ${
          isBorderOnly ? 'bg-white dark:bg-slate-900' : ''
        } ${
          contrastColors ? '' : 'text-slate-800 dark:text-slate-100'
        } ${displayMode === 'icon-only'
            ? `bg-transparent border-transparent ${iconOnlyFlexClass} ${selected ? 'ring-2' : ''}`
            : `items-center justify-center border-2 shadow-md dark:shadow-xl ${
                isVertical ? 'flex-col' : 'flex-row'
              } ${
                isProcessing
                  ? 'ring-4 ring-emerald-400/40 border-emerald-400'
                  : isNodeActive
                  ? 'ring-2'
                  : selected
                  ? 'ring-2 shadow-lg'
                  : 'hover:opacity-95'
              }`
        }`}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center shrink-0 overflow-hidden transition-all duration-300"
          style={displayMode === 'icon-only'
            ? (iconLabelPos === 'none'
                ? { width: '100%', height: '100%' }
                : iconLabelPos === 'top' || iconLabelPos === 'bottom'
                  ? { height: '65%', width: '100%' }
                  : { width: '50%', height: '100%' })
            : { width: `${iconBoxSize}px`, height: `${iconBoxSize}px` }
          }
        >
          {(() => {
            if (customStyles.productIcon) {
              const item = findDeviconItem(customStyles.productIcon);
              if (item) {
                const IconComponent = getDeviconComponent(
                  item,
                  customStyles.productIconColored !== false,
                  !!customStyles.productIconWordmark
                );
                if (IconComponent) {
                  const size = displayMode === 'icon-only' ? '80%' : iconPx;
                  const isColored = customStyles.productIconColored !== false;
                  const isHex = customStyles.iconColor?.startsWith('#');
                  const finalIconColor = isHex
                    ? customStyles.iconColor
                    : (isBorderOnly ? activeBgHex : (contrastColors ? contrastColors.iconColor : style.text));
                  return (
                    <div
                      className="flex items-center justify-center w-full h-full"
                      style={!isColored ? { color: finalIconColor } : undefined}
                    >
                      <IconComponent size={size} />
                    </div>
                  );
                }
              }
            }
            if (customTemplate) {
              return (
                <CustomSvgRenderer
                  layers={customTemplate.layers}
                  width={customTemplate.dimensions.width}
                  height={customTemplate.dimensions.height}
                />
              );
            }
            const isWhiteOrUndefinedBg = !activeBgHex || activeBgHex === '#ffffff' || activeBgHex === 'white';
            const defaultIconColor = (isBorderOnly && !isWhiteOrUndefinedBg)
              ? activeBgHex
              : (contrastColors ? contrastColors.iconColor : style.text);
            const overrideColor = customStyles.iconColor || ((isBorderOnly && !isWhiteOrUndefinedBg) ? activeBgHex : (contrastColors ? contrastColors.iconColor : undefined));
            return getIcon(type, defaultIconColor, displayMode === 'icon-only', overrideColor, iconPx);
          })()}
        </div>

        {/* Icon-only Label Position */}
        {displayMode === 'icon-only' && iconLabelPos !== 'none' && (
          <div
            className="font-bold text-slate-800 dark:text-slate-200 select-none whitespace-nowrap px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/60 dark:border-slate-800/60 shadow-xs shrink-0"
            style={{ fontSize: `${Math.max(9, Math.round(11 * scale))}px` }}
          >
            {name}
          </div>
        )}

        {/* Divider (only for horizontal layout with text) */}
        {displayMode === 'default' && !isVertical && (
          <div
            className="w-px shrink-0 self-center transition-colors"
            style={{
              height: `${dividerH}px`,
              backgroundColor: isBorderOnly ? 'rgba(148, 163, 184, 0.3)' : (contrastColors ? contrastColors.divider : 'rgba(255,255,255,0.25)')
            }}
          />
        )}

        {/* Text */}
        {displayMode === 'default' && (
          <div
            className="flex-1 min-w-0"
            style={isVertical ? {
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              overflow: 'hidden',
            } : {}}
          >
            <div
              className={`font-bold truncate transition-colors ${isBorderOnly ? 'text-slate-800 dark:text-slate-200' : ''}`}
              style={{
                fontSize: `${titleFontSize}px`,
                color: isBorderOnly ? undefined : (contrastColors ? contrastColors.text : '#ffffff')
              }}
            >
              {name}
            </div>
            {(() => {
              const displaySubtitle = customStyles.customType !== undefined
                ? customStyles.customType
                : (customTemplate ? customTemplate.category : type);
              if (!displaySubtitle || displaySubtitle.trim() === '') return null;
              return (
                <div
                  className={`font-bold uppercase tracking-wider mt-0.5 transition-colors ${isBorderOnly ? 'text-slate-400 dark:text-slate-500' : ''}`}
                  style={{
                    fontSize: `${subtitleFontSize}px`,
                    color: isBorderOnly ? undefined : (contrastColors ? contrastColors.subtext : 'rgba(255,255,255,0.75)')
                  }}
                >
                  {displaySubtitle}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
});
