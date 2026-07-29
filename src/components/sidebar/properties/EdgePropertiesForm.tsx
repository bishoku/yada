import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ActiveEdgeProperties } from '../../../types';
import { ParticleType, resolveParticleType } from '../../../config/particles';
import { ParticlePicker } from './ParticlePicker';
import { KeyValueEditor } from './KeyValueEditor';

export type EdgePropertiesFormRef = { submit: () => void; cancel: () => void };

interface EdgePropertiesFormProps {
  activeEdge: ActiveEdgeProperties;
  language: string;
  maxSteps: number;
  sequenceRoundTrip: boolean;
  sequenceAnimationMode?: 'normal' | 'roundTrip' | 'repeat';
  sequenceRepeatParticleCount?: number;
  onSubmit: (
    id: string, protocol: string, isAsync: boolean, duration: number, delay: number,
    tooltipText: string, tooltipDuration: number, description: string,
    particleType: ParticleType | undefined, showArrow: boolean, color: string,
    stepNumber: number, direction: 'forward' | 'reverse', isRoundTrip: boolean,
    animationMode?: 'normal' | 'roundTrip' | 'repeat', repeatParticleCount?: number,
    properties?: Record<string, unknown>,
    connectionType?: import('../../../types').EdgeConnectionType,
    strokeWidth?: number,
    lineStyle?: import('../../../types').EdgeLineStyle,
    arrowStart?: import('../../../types').EdgeArrowType,
    arrowEnd?: import('../../../types').EdgeArrowType,
    gradientColor?: string,
    labelPosition?: number,
    glowIntensity?: import('../../../types').EdgeGlowIntensity
  ) => void;
  /** Called immediately on every field change for live canvas preview */
  onPreview: (
    id: string, protocol: string, isAsync: boolean, duration: number, delay: number,
    tooltipText: string, tooltipDuration: number, description: string,
    particleType: ParticleType, showArrow: boolean, color: string,
    stepNumber: number, direction: 'forward' | 'reverse', isRoundTrip: boolean,
    animationMode?: 'normal' | 'roundTrip' | 'repeat', repeatParticleCount?: number,
    properties?: Record<string, unknown>,
    connectionType?: import('../../../types').EdgeConnectionType,
    strokeWidth?: number,
    lineStyle?: import('../../../types').EdgeLineStyle,
    arrowStart?: import('../../../types').EdgeArrowType,
    arrowEnd?: import('../../../types').EdgeArrowType,
    gradientColor?: string,
    labelPosition?: number,
    glowIntensity?: import('../../../types').EdgeGlowIntensity
  ) => void;
}

// Preset edge color palette (8 architectural colors)
const EDGE_COLORS = [
  { key: 'white',   value: '#ffffff', cls: 'bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700' },
  { key: 'slate',   value: '#64748b', cls: 'bg-slate-500' },
  { key: 'indigo',  value: '#6366f1', cls: 'bg-indigo-500' },
  { key: 'emerald', value: '#10b981', cls: 'bg-emerald-500' },
  { key: 'amber',   value: '#f59e0b', cls: 'bg-amber-500' },
  { key: 'rose',    value: '#f43f5e', cls: 'bg-rose-500' },
  { key: 'violet',  value: '#8b5cf6', cls: 'bg-violet-500' },
  { key: 'cyan',    value: '#06b6d4', cls: 'bg-cyan-500' },
];
const DEFAULT_COLOR = '';


/** Compact label */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
    {children}
  </span>
);

/** Compact text/number input with auto-select on focus */
const CompactInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  return (
    <input
      {...props}
      onFocus={handleFocus}
      className={`w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 ${props.className ?? ''}`}
    />
  );
};

/** Thin divider with optional inline label */
const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-2 pt-2 mt-0.5 border-t border-slate-100 dark:border-slate-800/70">
    {label && <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</span>}
    {label && <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/70" />}
  </div>
);

/**
 * EdgePropertiesForm
 * Compact, focused form for editing a single edge's properties.
 */
export const EdgePropertiesForm = forwardRef<EdgePropertiesFormRef, EdgePropertiesFormProps>(({

  activeEdge,
  language: lang,
  maxSteps,
  sequenceRoundTrip,
  sequenceAnimationMode,
  sequenceRepeatParticleCount,
  onSubmit,
  onPreview,
}, ref) => {
  const [protocol, setProtocol] = useState(activeEdge.protocol);
  const [isAsync, setIsAsync] = useState(activeEdge.isAsync);
  const [stepNumber, setStepNumber] = useState(activeEdge.stepNumber);
  const [duration, setDuration] = useState<number | string>(activeEdge.duration);
  const [delay, setDelay] = useState<number | string>(activeEdge.delay);
  const [tooltipText, setTooltipText] = useState(activeEdge.tooltipText);
  const [tooltipDuration, setTooltipDuration] = useState<number | string>(activeEdge.tooltipDuration);
  const [formRoundTrip, setFormRoundTrip] = useState(sequenceRoundTrip);
  const [formAnimationMode, setFormAnimationMode] = useState<'normal' | 'roundTrip' | 'repeat'>(
    sequenceAnimationMode ?? (sequenceRoundTrip ? 'roundTrip' : 'normal')
  );
  const [formRepeatCount, setFormRepeatCount] = useState<number | string>(sequenceRepeatParticleCount ?? 3);
  const [description, setDescription] = useState(activeEdge.description ?? '');
  const [particleType, setParticleType] = useState<ParticleType>(resolveParticleType(activeEdge.particleType));
  const [showArrow, setShowArrow] = useState(activeEdge.showArrow ?? false);
  const [color, setColor] = useState(activeEdge.color ?? DEFAULT_COLOR);
  const [properties, setProperties] = useState<Record<string, unknown>>(activeEdge.properties ?? {});

  // NEW Premium Styling State
  const [connectionType, setConnectionType] = useState<import('../../../types').EdgeConnectionType>(activeEdge.connectionType ?? 'bezier');
  const [strokeWidth, setStrokeWidth] = useState<number>(activeEdge.strokeWidth ?? 2);
  const [lineStyle, setLineStyle] = useState<import('../../../types').EdgeLineStyle>(activeEdge.lineStyle ?? (activeEdge.isAsync ? 'dashed' : 'solid'));
  const [arrowStart, setArrowStart] = useState<import('../../../types').EdgeArrowType>(activeEdge.arrowStart ?? 'none');
  const [arrowEnd, setArrowEnd] = useState<import('../../../types').EdgeArrowType>(activeEdge.arrowEnd ?? (activeEdge.showArrow ? 'triangle' : 'none'));
  const [gradientColor, setGradientColor] = useState<string>(activeEdge.gradientColor ?? '');
  const [labelPosition, setLabelPosition] = useState<number>(activeEdge.labelPosition ?? 50);
  const [glowIntensity, setGlowIntensity] = useState<import('../../../types').EdgeGlowIntensity>(activeEdge.glowIntensity ?? 'none');

  const [orig, setOrig] = useState({
    protocol: activeEdge.protocol, isAsync: activeEdge.isAsync,
    stepNumber: activeEdge.stepNumber, duration: activeEdge.duration,
    delay: activeEdge.delay, tooltipText: activeEdge.tooltipText,
    tooltipDuration: activeEdge.tooltipDuration, description: activeEdge.description ?? '',
    particleType: resolveParticleType(activeEdge.particleType),
    showArrow: activeEdge.showArrow ?? false,
    color: activeEdge.color ?? DEFAULT_COLOR,
    roundTrip: sequenceRoundTrip,
    animationMode: (sequenceAnimationMode ?? (sequenceRoundTrip ? 'roundTrip' : 'normal')) as 'normal' | 'roundTrip' | 'repeat',
    repeatParticleCount: sequenceRepeatParticleCount ?? 3,
    properties: activeEdge.properties ?? {},
    connectionType: activeEdge.connectionType ?? 'bezier',
    strokeWidth: activeEdge.strokeWidth ?? 2,
    lineStyle: activeEdge.lineStyle ?? (activeEdge.isAsync ? 'dashed' : 'solid'),
    arrowStart: activeEdge.arrowStart ?? 'none',
    arrowEnd: activeEdge.arrowEnd ?? (activeEdge.showArrow ? 'triangle' : 'none'),
    gradientColor: activeEdge.gradientColor ?? '',
    labelPosition: activeEdge.labelPosition ?? 50,
    glowIntensity: activeEdge.glowIntensity ?? 'none',
  });

  useEffect(() => {
    const snap = {
      protocol: activeEdge.protocol, isAsync: activeEdge.isAsync,
      stepNumber: activeEdge.stepNumber, duration: activeEdge.duration,
      delay: activeEdge.delay, tooltipText: activeEdge.tooltipText,
      tooltipDuration: activeEdge.tooltipDuration, description: activeEdge.description ?? '',
      particleType: resolveParticleType(activeEdge.particleType),
      showArrow: activeEdge.showArrow ?? false,
      color: activeEdge.color ?? DEFAULT_COLOR,
      roundTrip: sequenceRoundTrip,
      animationMode: (sequenceAnimationMode ?? (sequenceRoundTrip ? 'roundTrip' : 'normal')) as 'normal' | 'roundTrip' | 'repeat',
      repeatParticleCount: sequenceRepeatParticleCount ?? 3,
      properties: activeEdge.properties ?? {},
      connectionType: activeEdge.connectionType ?? 'bezier',
      strokeWidth: activeEdge.strokeWidth ?? 2,
      lineStyle: activeEdge.lineStyle ?? (activeEdge.isAsync ? 'dashed' : 'solid'),
      arrowStart: activeEdge.arrowStart ?? 'none',
      arrowEnd: activeEdge.arrowEnd ?? (activeEdge.showArrow ? 'triangle' : 'none'),
      gradientColor: activeEdge.gradientColor ?? '',
      labelPosition: activeEdge.labelPosition ?? 50,
      glowIntensity: activeEdge.glowIntensity ?? 'none',
    };
    setProtocol(snap.protocol); setIsAsync(snap.isAsync); setStepNumber(snap.stepNumber);
    setDuration(snap.duration); setDelay(snap.delay); setTooltipText(snap.tooltipText);
    setTooltipDuration(snap.tooltipDuration); setDescription(snap.description);
    setParticleType(snap.particleType); setShowArrow(snap.showArrow); setColor(snap.color);
    setFormRoundTrip(snap.roundTrip);
    setFormAnimationMode(snap.animationMode);
    setFormRepeatCount(snap.repeatParticleCount);
    setProperties(snap.properties);
    setConnectionType(snap.connectionType);
    setStrokeWidth(snap.strokeWidth);
    setLineStyle(snap.lineStyle);
    setArrowStart(snap.arrowStart);
    setArrowEnd(snap.arrowEnd);
    setGradientColor(snap.gradientColor);
    setLabelPosition(snap.labelPosition);
    setGlowIntensity(snap.glowIntensity);
    setOrig(snap);
  }, [activeEdge, sequenceRoundTrip, sequenceAnimationMode, sequenceRepeatParticleCount]);

  // Convenience: preview current values
  const preview = (o?: Partial<{
    p: string; ia: boolean; s: number; d: number | string; dl: number | string;
    tt: string; td: number | string; desc: string; pt: ParticleType; arr: boolean; clr: string;
    rt: boolean; am: 'normal' | 'roundTrip' | 'repeat'; rpc: number | string;
    props: Record<string, unknown>;
    ct: import('../../../types').EdgeConnectionType;
    sw: number;
    ls: import('../../../types').EdgeLineStyle;
    ast: import('../../../types').EdgeArrowType;
    aed: import('../../../types').EdgeArrowType;
    gc: string;
    lp: number;
    gi: import('../../../types').EdgeGlowIntensity;
  }>) => {
    const parseNum = (val: any, minVal: number, maxVal = Infinity) => {
      const n = Number(val);
      if (isNaN(n)) return minVal;
      return Math.max(minVal, Math.min(maxVal, n));
    };

    onPreview(
      activeEdge.id,
      o?.p ?? protocol, o?.ia ?? isAsync,
      parseNum(o?.d !== undefined ? o.d : duration, 50),
      parseNum(o?.dl !== undefined ? o.dl : delay, 0),
      o?.tt ?? tooltipText,
      parseNum(o?.td !== undefined ? o.td : tooltipDuration, 100),
      o?.desc ?? description, o?.pt ?? particleType, o?.arr ?? showArrow, o?.clr ?? color,
      o?.s ?? stepNumber, 'forward', o?.rt ?? formRoundTrip,
      o?.am ?? formAnimationMode,
      parseNum(o?.rpc !== undefined ? o.rpc : formRepeatCount, 1, 10),
      o?.props ?? properties,
      o?.ct ?? connectionType,
      o?.sw ?? strokeWidth,
      o?.ls ?? lineStyle,
      o?.ast ?? arrowStart,
      o?.aed ?? arrowEnd,
      o?.gc !== undefined ? o.gc : gradientColor,
      o?.lp ?? labelPosition,
      o?.gi ?? glowIntensity,
    );
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      const parseNum = (val: any, minVal: number, maxVal = Infinity) => {
        const n = Number(val);
        if (isNaN(n)) return minVal;
        return Math.max(minVal, Math.min(maxVal, n));
      };
      onSubmit(
        activeEdge.id,
        protocol,
        isAsync,
        parseNum(duration, 50),
        parseNum(delay, 0),
        tooltipText,
        parseNum(tooltipDuration, 100),
        description,
        particleType,
        showArrow,
        color,
        stepNumber,
        'forward',
        formRoundTrip,
        formAnimationMode,
        parseNum(formRepeatCount, 1, 10),
        properties,
        connectionType,
        strokeWidth,
        lineStyle,
        arrowStart,
        arrowEnd,
        gradientColor,
        labelPosition,
        glowIntensity
      );
    },
    cancel: () => {
      setProtocol(orig.protocol); setIsAsync(orig.isAsync); setStepNumber(orig.stepNumber);
      setDuration(orig.duration); setDelay(orig.delay); setTooltipText(orig.tooltipText);
      setTooltipDuration(orig.tooltipDuration); setDescription(orig.description);
      setParticleType(orig.particleType); setShowArrow(orig.showArrow); setColor(orig.color);
      setFormRoundTrip(orig.roundTrip);
      setFormAnimationMode(orig.animationMode);
      setFormRepeatCount(orig.repeatParticleCount);
      setProperties(orig.properties);
      setConnectionType(orig.connectionType);
      setStrokeWidth(orig.strokeWidth);
      setLineStyle(orig.lineStyle);
      setArrowStart(orig.arrowStart);
      setArrowEnd(orig.arrowEnd);
      setGradientColor(orig.gradientColor);
      setLabelPosition(orig.labelPosition);
      setGlowIntensity(orig.glowIntensity);
      onPreview(activeEdge.id, orig.protocol, orig.isAsync, orig.duration, orig.delay,
        orig.tooltipText, orig.tooltipDuration, orig.description, orig.particleType, orig.showArrow, orig.color,
        orig.stepNumber, 'forward', orig.roundTrip, orig.animationMode, orig.repeatParticleCount, orig.properties,
        orig.connectionType, orig.strokeWidth, orig.lineStyle, orig.arrowStart, orig.arrowEnd, orig.gradientColor,
        orig.labelPosition, orig.glowIntensity);
    },
  }), [activeEdge.id, protocol, isAsync, duration, delay, tooltipText, tooltipDuration,
       description, particleType, showArrow, color, stepNumber, formRoundTrip, formAnimationMode, formRepeatCount, properties,
       connectionType, strokeWidth, lineStyle, arrowStart, arrowEnd, gradientColor, labelPosition, glowIntensity, orig, onSubmit, onPreview]);

  const tr = (t: string, e: string) => lang === 'tr' ? t : e;

  return (
    <div className="flex flex-col gap-2">

      {/* Protocol + Step — side by side */}
      <div className="grid grid-cols-[1fr_80px] gap-2">
        <div className="flex flex-col gap-1">
          <Label>{tr('Protokol', 'Protocol')}</Label>
          <CompactInput
            type="text"
            placeholder="HTTP, gRPC, WS..."
            value={protocol}
            onChange={(e) => { setProtocol(e.target.value); preview({ p: e.target.value }); }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>{tr('Adım', 'Step')}</Label>
          <select
            value={stepNumber}
            onChange={(e) => { setStepNumber(Number(e.target.value)); preview({ s: Number(e.target.value) }); }}
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer font-bold"
          >
            {Array.from({ length: maxSteps }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>#{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Edge Color — 4x2 Preset Grid + Custom Color Row */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <Label>{tr('Bağlantı Rengi', 'Edge Color')}</Label>
        </div>

        {/* 4x2 Presets Grid */}
        <div className="grid grid-cols-4 gap-2">
          {EDGE_COLORS.map((ec) => (
            <button
              key={ec.key}
              type="button"
              onClick={() => { setColor(ec.value); preview({ clr: ec.value }); }}
              className={`h-5 rounded-full ${ec.cls} hover:scale-105 active:scale-95 transition-transform cursor-pointer flex items-center justify-center ${
                color === ec.value ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900 scale-105 shadow-sm' : ''
              }`}
              title={ec.key}
            />
          ))}
        </div>

        {/* Custom Color Picker Row */}
        <div className="flex items-center justify-between pt-0.5">
          <Label>{tr('Özel Renk Paleti', 'Custom Color')}</Label>
          <div className="flex items-center gap-2">
            {color.startsWith('#') && (
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                {color}
              </span>
            )}
            <div
              className={`w-5 h-5 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 ${
                color.startsWith('#') ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900 scale-110 shadow-sm' : 'hover:scale-105 transition-transform'
              }`}
              title={tr('Özel Renk Seçici', 'Custom Color Picker')}
            >
              <input
                type="color"
                value={color?.startsWith('#') ? color : '#6366f1'}
                onChange={(e) => { setColor(e.target.value); preview({ clr: e.target.value }); }}
                className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0 bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Premium Edge Styling Section ────────────────────────────────────────── */}
      <Divider label={tr('Çizgi & Yönlendirme Stili', 'Edge & Routing Style')} />

      {/* 1. Connection Type Selector (Bezier, Smooth, Step, Straight) */}
      <div className="flex flex-col gap-1">
        <Label>{tr('Çizgi Tipi', 'Connection Type')}</Label>
        <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          {(
            [
              { id: 'bezier', label: 'Bezier', icon: 'M2,14 C8,2 12,18 18,6' },
              { id: 'smoothstep', label: 'Smooth', icon: 'M2,16 L8,16 Q14,16 14,10 L14,4' },
              { id: 'step', label: 'Step', icon: 'M2,16 L11,16 L11,4 M11,4 L18,4' },
              { id: 'straight', label: 'Direct', icon: 'M3,17 L17,3' },
            ] as const
          ).map((ct) => (
            <button
              key={ct.id}
              type="button"
              onClick={() => {
                setConnectionType(ct.id);
                preview({ ct: ct.id });
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-md transition-all cursor-pointer ${
                connectionType === ct.id
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title={ct.label}
            >
              <svg className="w-5 h-5 stroke-current fill-none stroke-[2]" viewBox="0 0 20 20">
                <path d={ct.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[8px] tracking-tight mt-0.5">{ct.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Line Style (Pattern) & Stroke Width */}
      <div className="grid grid-cols-2 gap-2">
        {/* Line Style */}
        <div className="flex flex-col gap-1">
          <Label>{tr('Çizgi Desen', 'Pattern')}</Label>
          <select
            value={lineStyle}
            onChange={(e) => {
              const ls = e.target.value as import('../../../types').EdgeLineStyle;
              setLineStyle(ls);
              preview({ ls });
            }}
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
          >
            <option value="solid">Düz (Solid)</option>
            <option value="dashed">Çizgili (Dashed)</option>
            <option value="dotted">Noktalı (Dotted)</option>
            <option value="longDash">Uzun Çizgili</option>
            <option value="dashDot">Çizgi-Nokta</option>
          </select>
        </div>

        {/* Stroke Width Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Label>{tr('Kalınlık', 'Thickness')}</Label>
            <span className="text-[9px] font-mono text-indigo-500 font-bold">{strokeWidth}px</span>
          </div>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={strokeWidth}
            onChange={(e) => {
              const sw = Number(e.target.value);
              setStrokeWidth(sw);
              preview({ sw });
            }}
            className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer mt-1"
          />
        </div>
      </div>

      {/* 3. Arrowhead Pickers (Start & End) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label>{tr('Başlangıç Oku', 'Start Arrow')}</Label>
          <select
            value={arrowStart}
            onChange={(e) => {
              const ast = e.target.value as import('../../../types').EdgeArrowType;
              setArrowStart(ast);
              preview({ ast });
            }}
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
          >
            <option value="none">Yok (None)</option>
            <option value="triangle">Üçgen (Triangle)</option>
            <option value="open">Açık Ok (Open)</option>
            <option value="diamond">Baklava (Diamond)</option>
            <option value="circle">Daire (Circle)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label>{tr('Bitiş Oku', 'End Arrow')}</Label>
          <select
            value={arrowEnd}
            onChange={(e) => {
              const aed = e.target.value as import('../../../types').EdgeArrowType;
              setArrowEnd(aed);
              setShowArrow(aed !== 'none');
              preview({ aed, arr: aed !== 'none' });
            }}
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
          >
            <option value="none">Yok (None)</option>
            <option value="triangle">Üçgen (Triangle)</option>
            <option value="open">Açık Ok (Open)</option>
            <option value="diamond">Baklava (Diamond)</option>
            <option value="circle">Daire (Circle)</option>
          </select>
        </div>
      </div>

      {/* 4. Gradient Color & Glow Intensity */}
      <div className="grid grid-cols-2 gap-2">
        {/* Gradient Color */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Label>{tr('Gradient Bitiş', 'Gradient End')}</Label>
            {gradientColor && (
              <button
                type="button"
                onClick={() => { setGradientColor(''); preview({ gc: '' }); }}
                className="text-[8px] text-rose-500 hover:underline cursor-pointer"
              >
                Temizle
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
              <input
                type="color"
                value={gradientColor || color || '#6366f1'}
                onChange={(e) => {
                  setGradientColor(e.target.value);
                  preview({ gc: e.target.value });
                }}
                className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0 bg-transparent"
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate">
              {gradientColor || tr('Geçiş Yok', 'None')}
            </span>
          </div>
        </div>

        {/* Glow Intensity */}
        <div className="flex flex-col gap-1">
          <Label>{tr('Glow Efekti', 'Glow Effect')}</Label>
          <select
            value={glowIntensity}
            onChange={(e) => {
              const gi = e.target.value as import('../../../types').EdgeGlowIntensity;
              setGlowIntensity(gi);
              preview({ gi });
            }}
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
          >
            <option value="none">Yok (Off)</option>
            <option value="subtle">Hafif (Subtle)</option>
            <option value="strong">Yüksek (Strong)</option>
            <option value="neon">Neon Halo</option>
          </select>
        </div>
      </div>

      {/* 5. Label Position Slider */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Label>{tr('Etiket Konumu', 'Label Position')}</Label>
          <span className="text-[9px] font-mono text-indigo-500 font-bold">%{labelPosition}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={15}
            max={85}
            step={5}
            value={labelPosition}
            onChange={(e) => {
              const lp = Number(e.target.value);
              setLabelPosition(lp);
              preview({ lp });
            }}
            className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex gap-1 shrink-0">
            {[25, 50, 75].map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => { setLabelPosition(pos); preview({ lp: pos }); }}
                className={`px-1.5 py-0.5 text-[8px] font-mono rounded border cursor-pointer ${
                  labelPosition === pos
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                }`}
              >
                %{pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Duration + Delay — side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label>{tr('Süre (ms)', 'Duration')}</Label>
          <CompactInput
            type="number"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              preview({ d: e.target.value });
            }}
            onBlur={() => {
              const val = Math.max(50, Number(duration) || 50);
              setDuration(val);
              preview({ d: val });
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>{tr('Gecikme (ms)', 'Delay')}</Label>
          <CompactInput
            type="number"
            value={delay}
            onChange={(e) => {
              setDelay(e.target.value);
              preview({ dl: e.target.value });
            }}
            onBlur={() => {
              const val = Math.max(0, Number(delay) || 0);
              setDelay(val);
              preview({ dl: val });
            }}
          />
        </div>
      </div>

      {/* Animation Mode — radio group */}
      <Divider label={tr('Simülasyon Modu', 'Animation Mode')} />

      <div className="flex flex-col gap-1.5">
        {/* Normal */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio" name="animMode" value="normal"
            checked={formAnimationMode === 'normal'}
            onChange={() => { setFormAnimationMode('normal'); setFormRoundTrip(false); preview({ rt: false, am: 'normal' }); }}
            className="accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
          />
          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
            {tr('Normal', 'Normal')}
          </span>
        </label>

        {/* Round-Trip */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio" name="animMode" value="roundTrip"
            checked={formAnimationMode === 'roundTrip'}
            onChange={() => { setFormAnimationMode('roundTrip'); setFormRoundTrip(true); preview({ rt: true, am: 'roundTrip' }); }}
            className="accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
          />
          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
            {tr('Gidiş-Dönüş', 'Round-Trip')}
          </span>
        </label>

        {/* Repeat */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio" name="animMode" value="repeat"
            checked={formAnimationMode === 'repeat'}
            onChange={() => { setFormAnimationMode('repeat'); setFormRoundTrip(false); preview({ rt: false, am: 'repeat', rpc: formRepeatCount }); }}
            className="accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
          />
          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
            {tr('Sürekli Tekrar', 'Repeat')}
          </span>
        </label>

        {/* Particle Count — only visible when repeat is selected */}
        {formAnimationMode === 'repeat' && (
          <div className="ml-5 flex items-center gap-2 mt-0.5">
            <Label>{tr('Parçacık Sayısı', 'Particle Count')}</Label>
            <CompactInput
              type="number"
              style={{ width: 56 }}
              value={formRepeatCount}
              onChange={(e) => {
                setFormRepeatCount(e.target.value);
                preview({ rpc: e.target.value });
              }}
              onBlur={() => {
                const val = Math.max(1, Math.min(10, Number(formRepeatCount) || 1));
                setFormRepeatCount(val);
                preview({ rpc: val });
              }}
            />
          </div>
        )}
      </div>

      {/* Particle type — picker with preview */}
      <Divider label={tr('Parçacık', 'Particle')} />
      <ParticlePicker
        value={particleType}
        language={lang}
        onChange={(pt) => { setParticleType(pt); preview({ pt }); }}
      />

      {/* Internal process tooltip — compact two-column layout */}
      <Divider label={tr('Tooltip', 'Tooltip')} />
      <div className="grid grid-cols-[1fr_72px] gap-2">
        <CompactInput
          type="text"
          placeholder={tr('İşlem adı...', 'Process name...')}
          value={tooltipText}
          onChange={(e) => { setTooltipText(e.target.value); preview({ tt: e.target.value }); }}
        />
        <CompactInput
          type="number"
          value={tooltipDuration}
          onChange={(e) => {
            setTooltipDuration(e.target.value);
            preview({ td: e.target.value });
          }}
          onBlur={() => {
            const val = Math.max(100, Number(tooltipDuration) || 100);
            setTooltipDuration(val);
            preview({ td: val });
          }}
          placeholder="ms"
        />
      </div>

      {/* Description */}
      <Divider label={tr('Açıklama', 'Notes')} />
      <textarea
        rows={2}
        placeholder={tr('Bu adım hakkında not...', 'Step notes...')}
        value={description}
        onChange={(e) => { setDescription(e.target.value); preview({ desc: e.target.value }); }}
        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 resize-none"
      />

      {/* Key-Value Attributes Editor */}
      <KeyValueEditor
        properties={properties}
        onChange={(next) => { setProperties(next); preview({ props: next }); }}
        language={lang}
      />

    </div>
  );
});
