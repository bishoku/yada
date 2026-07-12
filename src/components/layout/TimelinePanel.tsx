import React, { useEffect, useRef, useState } from 'react';
import { 
  Plus, Settings, ArrowRightLeft, Trash2, Clock, X, Save
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { calculateSchedules } from '../../store/scheduler';
import { SequenceStep, TimelineTiming } from '../../types';
import { usePlayheadScrub } from '../timeline/usePlayheadScrub';
import { useTimingBarDrag } from '../timeline/useTimingBarDrag';
import { TimelineRuler } from '../timeline/TimelineRuler';
import { TimelineGrid } from '../timeline/TimelineGrid';
import { ScrubLine } from '../timeline/ScrubLine';

const PX_PER_MS = 0.2; // 1000ms = 200px

export const TimelinePanel: React.FC = () => {
  // Selective Zustand selectors to completely eliminate playback re-renders
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const selectedSequenceId = useAppStore((s) => s.selectedSequenceId);
  const theme = useAppStore((s) => s.theme);

  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const setSelectedSequenceId = useAppStore((s) => s.setSelectedSequenceId);
  const addSequenceStep = useAppStore((s) => s.addSequenceStep);
  const updateSequenceTiming = useAppStore((s) => s.updateSequenceTiming);
  const updateSequenceProcess = useAppStore((s) => s.updateSequenceProcess);
  const deleteSequenceStep = useAppStore((s) => s.deleteSequenceStep);
  const setSequenceStepOrder = useAppStore((s) => s.setSequenceStepOrder);
  const toggleSequenceAsync = useAppStore((s) => s.toggleSequenceAsync);

  const [showTooltipModal, setShowTooltipModal] = useState<string | null>(null);
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipDuration, setTooltipDuration] = useState(1000);
  const [showAddStepDropdown, setShowAddStepDropdown] = useState(false);

  const trackAreaRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  // Calculate schedules
  const schedules = calculateSchedules(logicalData.sequences, visualData.timelines);

  // Find max simulation time
  const maxTime = Math.max(
    2000,
    ...Object.values(schedules).map((s) => {
      const seqId = Object.keys(schedules).find(k => schedules[k] === s);
      const timing = seqId ? visualData.timelines[seqId] : null;
      const tooltipDur = timing?.internalProcess?.duration ?? 0;
      return s.end + tooltipDur;
    })
  );

  // Custom Hooks mapping layout interactions
  const { isScrubbing, handleTrackMouseDown } = usePlayheadScrub(
    trackAreaRef,
    playheadRef,
    maxTime,
    setCurrentTime
  );

  const { handleBarMouseDown, handleResizeMouseDown } = useTimingBarDrag(
    updateSequenceTiming
  );

  // Playback Animation Loop (Updates playhead directly in the store)
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    let previousTime: number | null = null;

    const tick = (timestamp: number) => {
      if (previousTime !== null) {
        const delta = timestamp - previousTime;
        const state = useAppStore.getState();
        const nextTime = state.currentTime + delta * state.playbackRate;

        if (nextTime >= maxTime) {
          state.stopPlayback();
          return;
        }

        state.setCurrentTime(nextTime);
      }

      previousTime = timestamp;
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isPlaying, maxTime]);

  // Add a step manually for a specific edge
  const handleAddStep = (edgeId: string) => {
    const nextStepNum = logicalData.sequences.length > 0 
      ? Math.max(...logicalData.sequences.map(s => s.stepNumber)) + 1 
      : 1;

    const seqId = `seq-${Date.now()}`;
    const newStep: SequenceStep = {
      id: seqId,
      stepNumber: nextStepNum,
      edgeId,
      isAsync: false,
    };
    const newTiming: TimelineTiming = {
      sequenceId: seqId,
      duration: 1000,
      delay: 0,
    };
    addSequenceStep(newStep, newTiming);
    setShowAddStepDropdown(false);
  };

  // Open the tooltip configuration modal
  const openTooltipModal = (seqId: string) => {
    const timing = visualData.timelines[seqId];
    setTooltipText(timing?.internalProcess?.text ?? '');
    setTooltipDuration(timing?.internalProcess?.duration ?? 1000);
    setShowTooltipModal(seqId);
  };

  // Save tooltip settings
  const handleSaveTooltip = () => {
    if (showTooltipModal) {
      updateSequenceProcess(showTooltipModal, tooltipText, tooltipDuration);
      setShowTooltipModal(null);
    }
  };

  // Sort sequences by stepNumber and id
  const sortedSequences = [...logicalData.sequences].sort((a, b) => {
    if (a.stepNumber !== b.stepNumber) {
      return a.stepNumber - b.stepNumber;
    }
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 transition-colors duration-300 text-slate-800 dark:text-slate-100 select-none font-sans">
      {/* Playback Controls & Top bar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/60 backdrop-blur-md shrink-0">
        
        {/* Left: Section Label */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {theme === 'dark' ? 'Zaman Çizelgesi & Simülasyon' : 'Timeline & Simulation'}
          </span>
        </div>

        {/* Right: Add Buttons */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowAddStepDropdown(!showAddStepDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-500/15 active:scale-95 transition-all cursor-pointer animate-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{theme === 'dark' ? 'Adım Ekle' : 'Add Step'}</span>
            </button>
            
            {showAddStepDropdown && (
              <div className="absolute right-0 bottom-10 z-50 min-w-[220px] max-h-[200px] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {logicalData.edges.length === 0 ? (
                  <div className="p-3 text-[11px] text-slate-500 italic text-center">
                    {theme === 'dark' ? 'Bağlantı bulunamadı.' : 'No connections available.'}
                  </div>
                ) : (
                  logicalData.edges.map((edge) => {
                    const src = logicalData.nodes.find((n) => n.id === edge.from)?.name ?? edge.from;
                    const dst = logicalData.nodes.find((n) => n.id === edge.to)?.name ?? edge.to;
                    return (
                      <button
                        key={edge.id}
                        onClick={() => handleAddStep(edge.id)}
                        className="text-left w-full text-xs px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors truncate cursor-pointer animate-none"
                      >
                        {src} → {dst}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Unified Scrollable Timeline Workspace */}
      <div 
        ref={trackAreaRef}
        onMouseDown={handleTrackMouseDown}
        className="flex-1 overflow-auto min-h-0 relative bg-slate-50/20 dark:bg-slate-900/10"
      >
        <div 
          className="flex min-h-full relative" 
          style={{ width: maxTime * PX_PER_MS + 280 }}
        >
          
          {/* Left Side: Step labels column - Pinned Sticky to Left */}
          <div 
            className="w-[280px] sticky left-0 z-30 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-850 flex flex-col shrink-0"
            onMouseDown={(e) => e.stopPropagation()} // Prevent setting playhead when clicking left panel
          >
            {/* Header Spacer Row */}
            <div className="h-6 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center px-3 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {theme === 'dark' ? 'Akış Adımları' : 'Flow Steps'}
            </div>

            {sortedSequences.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <Clock className="w-8 h-8 text-slate-350 dark:text-slate-650 stroke-[1.5] mb-2" />
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-450">
                  {theme === 'dark' ? 'Akış Adımı Yok' : 'No Animation Steps'}
                </span>
                <p className="text-[9px] text-slate-400 dark:text-slate-550 max-w-[200px] mt-1 leading-normal">
                  {theme === 'dark' 
                    ? 'Canvas üzerinde bağlantı çizerek otomatik olarak akış oluşturabilirsiniz.' 
                    : 'Draw connection line on canvas to auto-create step.'}
                </p>
              </div>
            ) : (
              sortedSequences.map((seq) => {
                const edge = logicalData.edges.find((e) => e.id === seq.edgeId);
                const src = edge ? logicalData.nodes.find((n) => n.id === edge.from)?.name ?? edge.from : '?';
                const dst = edge ? logicalData.nodes.find((n) => n.id === edge.to)?.name ?? edge.to : '?';
                
                const isSelected = selectedSequenceId === seq.id;
                const timing = visualData.timelines[seq.id];
                const hasProcess = !!timing?.internalProcess;

                return (
                  <div
                    key={seq.id}
                    onClick={() => setSelectedSequenceId(seq.id)}
                    className={`h-12 px-3 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between cursor-pointer group transition-colors duration-150 ${
                      isSelected 
                        ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-l-4 border-l-indigo-600' 
                        : 'hover:bg-slate-100/50 dark:hover:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold bg-indigo-500/10 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded">
                          S{seq.stepNumber}
                        </span>
                        <span className="text-xs font-bold truncate text-slate-700 dark:text-slate-200">
                          {src} → {dst}
                        </span>
                      </div>
                      {hasProcess && (
                        <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-500 truncate pl-1">
                          ↳ Process: {timing?.internalProcess?.text}
                        </span>
                      )}
                    </div>
                    
                    {/* Row Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        value={seq.stepNumber}
                        onChange={(e) => setSequenceStepOrder(seq.id, Number(e.target.value))}
                        className="text-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.5 font-bold cursor-pointer focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <option key={n} value={n}>Step {n}</option>
                        ))}
                      </select>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSequenceAsync(seq.id);
                        }}
                        title={seq.isAsync ? "Asynchronous flow" : "Synchronous flow"}
                        className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer animate-none ${
                          seq.isAsync ? 'text-emerald-500' : 'text-slate-400'
                        }`}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTooltipModal(seq.id);
                        }}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer animate-none"
                        title="Configure tooltip"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSequenceStep(seq.id);
                        }}
                        className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer animate-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Right Side: Track Grid Canvas area */}
          <div className="flex-1 flex flex-col relative h-full">
            {/* Ruler Header Spacer Row */}
            <TimelineRuler maxTime={maxTime} pxPerMs={PX_PER_MS} />

            {/* Tracks Container */}
            <div className="flex-1 relative">
              {/* Timeline Grid Background (Vertical lines stretching down) */}
              <TimelineGrid maxTime={maxTime} pxPerMs={PX_PER_MS} />

              {/* Row Timing Tracks */}
              <div className="flex flex-col relative z-20" style={{ width: maxTime * PX_PER_MS }}>
                {sortedSequences.map((seq) => {
                  const timing = visualData.timelines[seq.id] || { sequenceId: seq.id, duration: 1000, delay: 0 };
                  const sched = schedules[seq.id];
                  if (!sched) return null;

                  const left = sched.start * PX_PER_MS;
                  const width = (timing.duration ?? 1000) * PX_PER_MS;
                  const isSelected = selectedSequenceId === seq.id;

                  return (
                    <div 
                      key={seq.id} 
                      className="h-12 border-b border-slate-200/50 dark:border-slate-800/20 relative flex items-center"
                      style={{ width: '100%' }}
                    >
                      {/* Interactive Drag Bar */}
                      <div
                        onMouseDown={(e) => {
                          setSelectedSequenceId(seq.id);
                          handleBarMouseDown(e, seq.id, timing.delay ?? 0, timing.duration ?? 1000);
                        }}
                        onDoubleClick={() => openTooltipModal(seq.id)}
                        className={`h-6 rounded-lg absolute cursor-grab active:cursor-grabbing transition-shadow flex items-center justify-between px-2 text-[10px] font-bold text-white group border ${
                          isSelected 
                            ? 'ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-600/10' 
                            : 'shadow-sm'
                        } ${
                          seq.isAsync 
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400/30' 
                            : 'bg-gradient-to-r from-indigo-500 to-indigo-600 border-indigo-400/30'
                        }`}
                        style={{
                          left,
                          width,
                        }}
                      >
                        <span className="truncate pr-4 pointer-events-none select-none">
                          {timing.duration}ms
                        </span>

                        {/* Resize handle on right */}
                        <div
                          onMouseDown={(e) => {
                            handleResizeMouseDown(e, seq.id, timing.delay ?? 0, timing.duration ?? 1000);
                          }}
                          className="absolute right-0 top-0 bottom-0 w-2 hover:w-3 cursor-ew-resize hover:bg-white/20 rounded-r-lg flex items-center justify-center transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time playhead line (Subscribed directly to high-frequency currentTime) */}
              <ScrubLine 
                pxPerMs={PX_PER_MS} 
                isPlaying={isPlaying} 
                isScrubbing={isScrubbing} 
                playheadRef={playheadRef} 
              />
            </div>
          </div>

        </div>
      </div>

      {/* Tooltip Internal Process Modal */}
      {showTooltipModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
          <div className="w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {theme === 'dark' ? 'Bileşen İçi İşlem Ekle' : 'Configure Node Tooltip'}
              </span>
              <button 
                onClick={() => setShowTooltipModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {theme === 'dark' ? 'Tooltip Metni' : 'Tooltip Text'}
                </label>
                <input
                  type="text"
                  placeholder="örn: Veri Kaydediliyor..."
                  value={tooltipText}
                  onChange={(e) => setTooltipText(e.target.value)}
                  className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-650 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {theme === 'dark' ? 'Ekranda Kalma Süresi (ms)' : 'Display Duration (ms)'}
                </label>
                <input
                  type="number"
                  value={tooltipDuration}
                  onChange={(e) => setTooltipDuration(Number(e.target.value))}
                  className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-650 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => setShowTooltipModal(null)}
                className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {theme === 'dark' ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveTooltip}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{theme === 'dark' ? 'Kaydet' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
