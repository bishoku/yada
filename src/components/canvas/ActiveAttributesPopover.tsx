import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const ActiveAttributesPopover: React.FC = () => {
  const language = useAppStore((s) => s.language);
  const currentTime = useAppStore((s) => s.currentTime);
  const schedules = useAppStore((s) => s.schedules);
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);

  const [popoverExpanded, setPopoverExpanded] = useState(false);

  const activeAttributes = useMemo(() => {
    const activeNodesWithProps: Array<{ name: string; properties: Record<string, unknown> }> = [];
    const activeEdgesWithProps: Array<{ name: string; stepNumber: number; properties: Record<string, unknown> }> = [];

    logicalData.sequences.forEach((seq) => {
      const edge = logicalData.edges.find((e) => e.id === seq.edgeId);
      if (!edge) return;

      const sched = schedules[seq.id];
      if (!sched) return;

      const timing = visualData.timelines[seq.id];
      const stepDuration = timing?.duration ?? 1000;

      // 1. Edge Active Check
      const effectiveMode = seq.animationMode ?? (seq.isRoundTrip ? 'roundTrip' : 'normal');
      let edgeAnimating = false;

      if (effectiveMode === 'repeat') {
        if (currentTime >= sched.start) {
          let timelineEnd = sched.end;
          for (const key in schedules) {
            if (schedules[key].end > timelineEnd) timelineEnd = schedules[key].end;
          }
          if (currentTime <= timelineEnd) {
            edgeAnimating = true;
          }
        }
      } else {
        if (currentTime >= sched.start && currentTime <= sched.end) {
          edgeAnimating = true;
        }
      }

      if (edgeAnimating && edge.properties && Object.keys(edge.properties).length > 0) {
        const edgeName = `${seq.stepNumber}. [${edge.protocol || 'Call'}] ${edge.description || ''}`.trim();
        if (!activeEdgesWithProps.some((e) => e.name === edgeName)) {
          activeEdgesWithProps.push({
            name: edgeName,
            stepNumber: seq.stepNumber,
            properties: edge.properties,
          });
        }
      }

      // 2. Node Active Check
      const ipDuration = (!seq.isRoundTrip && timing?.internalProcess)
        ? (timing.internalProcess.duration ?? 1000)
        : 0;
      const activeEnd = sched.end + ipDuration;

      if (currentTime >= sched.start && currentTime <= activeEnd) {
        const elapsed = currentTime - sched.start;
        let sourceActive = false;
        let targetActive = false;

        if (seq.isRoundTrip) {
          const halfTransit = stepDuration / 2;
          const totalElapsed = sched.end - sched.start;
          const returnStartElapsed = totalElapsed - halfTransit;

          if (elapsed < halfTransit || elapsed >= returnStartElapsed) {
            sourceActive = true;
          }
          if (elapsed >= halfTransit && elapsed < returnStartElapsed) {
            targetActive = true;
          }
        } else {
          const transitDuration = stepDuration;
          if (elapsed < transitDuration) {
            sourceActive = true;
          }
          if (elapsed >= transitDuration) {
            targetActive = true;
          }
        }

        if (sourceActive) {
          const srcNode = logicalData.nodes.find((n) => n.id === edge.sourceId);
          if (srcNode && srcNode.properties && Object.keys(srcNode.properties).length > 0) {
            if (!activeNodesWithProps.some((n) => n.name === srcNode.name)) {
              activeNodesWithProps.push({
                name: srcNode.name,
                properties: srcNode.properties,
              });
            }
          }
        }

        if (targetActive) {
          const tgtNode = logicalData.nodes.find((n) => n.id === edge.targetId);
          if (tgtNode && tgtNode.properties && Object.keys(tgtNode.properties).length > 0) {
            if (!activeNodesWithProps.some((n) => n.name === tgtNode.name)) {
              activeNodesWithProps.push({
                name: tgtNode.name,
                properties: tgtNode.properties,
              });
            }
          }
        }
      }
    });

    if (activeNodesWithProps.length === 0 && activeEdgesWithProps.length === 0) {
      return null;
    }

    return {
      nodes: activeNodesWithProps,
      edges: activeEdgesWithProps,
    };
  }, [currentTime, schedules, logicalData, visualData]);

  const dynamicTitle = useMemo(() => {
    if (!activeAttributes) {
      return language === 'tr' ? 'Aktif Öznitelikler' : 'Active Attributes';
    }
    const nodeNames = activeAttributes.nodes.map(n => n.name);
    const edgeSteps = activeAttributes.edges.map(e => `${language === 'tr' ? 'Adım' : 'Step'} ${e.stepNumber}`);
    
    if (nodeNames.length > 0 && edgeSteps.length > 0) {
      return `${nodeNames.join(', ')} - ${edgeSteps.join(', ')}`;
    }
    if (nodeNames.length > 0) {
      return nodeNames.join(', ');
    }
    if (edgeSteps.length > 0) {
      return edgeSteps.join(', ');
    }
    return language === 'tr' ? 'Aktif Öznitelikler' : 'Active Attributes';
  }, [activeAttributes, language]);

  return (
    <div className="absolute top-4 right-4 z-40 font-sans select-none animate-in fade-in slide-in-from-top-4 duration-300">
      {!popoverExpanded ? (
        <button
          onClick={() => setPopoverExpanded(true)}
          className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-900/70 hover:bg-white/95 dark:hover:bg-slate-900/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          title={language === 'tr' ? 'Öznitelikleri Göster' : 'Show Attributes'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      ) : (
        <div className="w-[200px] max-h-[220px] p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-1.5 relative transition-all duration-300">
          {/* Header */}
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/30 dark:border-slate-800/30 shrink-0">
            <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex-1 truncate" title={dynamicTitle}>
              {dynamicTitle}
            </span>
          </div>

          {/* Attributes Content List */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2 pb-5 scrollbar-thin">
            {activeAttributes ? (
              <>
                {/* Nodes attributes */}
                {activeAttributes.nodes.map((node, nodeIdx) => (
                  <div key={`attr-node-${nodeIdx}`} className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide truncate">
                      {node.name}
                    </span>
                    <div className="flex flex-col gap-0.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                      {Object.entries(node.properties).map(([key, val]) => (
                        <div key={key} className="flex text-[9px] gap-1 truncate">
                          <span className="font-semibold text-slate-400 dark:text-slate-500">{key}:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-350">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Edges attributes */}
                {activeAttributes.edges.map((edge, edgeIdx) => (
                  <div key={`attr-edge-${edgeIdx}`} className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide truncate">
                      {edge.name}
                    </span>
                    <div className="flex flex-col gap-0.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                      {Object.entries(edge.properties).map(([key, val]) => (
                        <div key={key} className="flex text-[9px] gap-1 truncate">
                          <span className="font-semibold text-slate-400 dark:text-slate-500">{key}:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-350">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex items-center justify-center py-6 text-slate-450 dark:text-slate-500 italic text-[9px]">
                {language === 'tr' ? 'Aktif öznitelik yok' : 'No active attributes'}
              </div>
            )}
          </div>

          {/* Collapse button - Bottom Left */}
          <button
            onClick={() => setPopoverExpanded(false)}
            className="absolute bottom-1.5 left-1.5 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            title={language === 'tr' ? 'Gizle' : 'Collapse'}
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
