import { useUiCopy } from '../../i18n/useUiCopy';
import { message } from '../../i18n/messages';
import React, { useState, useEffect, useRef, memo } from 'react';
import { Check, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface InlineEdgeEditorProps {
  edgeId: string;
  initialProtocol: string;
  initialDescription: string;
  initialStepNumber?: number;
  sequenceId?: string;
  onClose: () => void;
}

const COMMON_PROTOCOLS = ['REST', 'gRPC', 'Kafka', 'SQL', 'WebSocket', 'RabbitMQ', 'Redis'];

export const InlineEdgeEditor: React.FC<InlineEdgeEditorProps> = memo(({
  edgeId,
  initialProtocol,
  initialDescription,
  initialStepNumber,
  sequenceId,
  onClose,
}) => {
  const uiCopy = useUiCopy();
  const language = useAppStore((s) => s.language);
  const pushToHistory = useAppStore((s) => s.pushToHistory);
  const updateEdgeDetails = useAppStore((s) => s.updateEdgeDetails);
  const setSequenceStepOrder = useAppStore((s) => s.setSequenceStepOrder);
  const logicalEdges = useAppStore((s) => s.logicalData.edges);
  const layoutEdges = useAppStore((s) => s.visualData.layoutEdges);

  const [protocol, setProtocol] = useState(initialProtocol || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [stepNumber, setStepNumber] = useState<number | ''>(initialStepNumber ?? 1);

  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    pushToHistory();

    const currentLogical = logicalEdges.find((e) => e.id === edgeId);
    const currentVisual = layoutEdges[edgeId];

    updateEdgeDetails(
      edgeId,
      protocol.trim(),
      currentLogical?.isAsync ?? false,
      description.trim(),
      undefined,
      undefined,
      undefined,
      undefined,
      currentVisual?.particleType,
      currentVisual?.showArrow,
      currentVisual?.color,
      currentLogical?.properties,
      currentVisual?.connectionType,
      currentVisual?.strokeWidth,
      currentVisual?.lineStyle,
      currentVisual?.arrowStart,
      currentVisual?.arrowEnd,
      currentVisual?.gradientColor,
      currentVisual?.labelPosition,
      currentVisual?.glowIntensity
    );

    if (sequenceId && stepNumber !== '' && Number(stepNumber) !== initialStepNumber) {
      setSequenceStepOrder(sequenceId, Number(stepNumber));
    }

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="z-50 w-64 p-3 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-2xl font-sans text-xs flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 select-none cursor-default"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <span className="font-bold text-slate-700 dark:text-slate-200 text-[11px]">
          {message(language, "InlineEdgeEditor.editEdge")}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Protocol Input */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {message(language, "InlineEdgeEditor.protocol")}
          </label>
          {initialStepNumber !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">{message(language, "InlineEdgeEditor.step")}:</span>
              <input
                type="number"
                min={1}
                value={stepNumber}
                onChange={(e) => setStepNumber(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-12 px-1.5 py-0.5 text-center text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={protocol}
          onChange={(e) => setProtocol(e.target.value)}
          placeholder={uiCopy.eGRESTGRPCKafka}
          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
        />

        {/* Quick Protocol Suggestions */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {COMMON_PROTOCOLS.map((proto) => (
            <button
              key={proto}
              type="button"
              onClick={() => setProtocol(proto)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                protocol.toLowerCase() === proto.toLowerCase()
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {proto}
            </button>
          ))}
        </div>
      </div>

      {/* Description Input */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {message(language, "InlineEdgeEditor.description")}
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={message(language, "InlineEdgeEditor.eGFetchUserData")}
          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 mt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
        >
          {message(language, "InlineEdgeEditor.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{message(language, "InlineEdgeEditor.save")}</span>
        </button>
      </div>
    </div>
  );
});

InlineEdgeEditor.displayName = 'InlineEdgeEditor';
