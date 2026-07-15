import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
} from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import { useSequenceLayout } from './useSequenceLayout';
import { SeqParticipantNode } from './nodes/SeqParticipantNode';
import { SeqFragmentNode } from './nodes/SeqFragmentNode';
import { SeqMessageEdge } from './edges/SeqMessageEdge';

// ── Custom node/edge type registrations ─────────────────────────────────────
const nodeTypes: NodeTypes = {
  seqParticipant: SeqParticipantNode,
  seqFragment: SeqFragmentNode,
};

const edgeTypes: EdgeTypes = {
  seqMessage: SeqMessageEdge,
};

function isColorDark(color: string): boolean {
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  } else if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return true;
}

// ── Inner wrapper (must be inside ReactFlowProvider) ────────────────────────
function SeqFlowWrapper() {
  const theme = useAppStore((s) => s.theme);
  const gridVisible = useAppStore((s) => s.visualData.canvas.gridVisible !== false);
  const bgColor = useAppStore((s) => s.visualData.canvas.bgColor);
  const { rfNodes, rfEdges } = useSequenceLayout();
  const { fitView } = useReactFlow();

  // Listen for export requests to fit the view before capturing image
  useEffect(() => {
    const handleFitView = () => {
      fitView({ padding: 0.2, duration: 100 });
    };
    window.addEventListener('export:fitview', handleFitView);
    return () => {
      window.removeEventListener('export:fitview', handleFitView);
    };
  }, [fitView]);

  const isBgDark = bgColor ? isColorDark(bgColor) : theme === 'dark';
  const isDark = theme === 'dark';
  const dotColor = isBgDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.25)';

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);
  const fitViewOptions = useMemo(() => ({ padding: 0.2 }), []);

  const isEmpty = rfNodes.length === 0 && rfEdges.length === 0;

  if (isEmpty) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          color: isBgDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)',
          fontSize: '14px',
          background: bgColor || (isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'),
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: '0 auto 12px', opacity: 0.5 }}
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
            <circle cx="8" cy="6" r="1.5" fill="currentColor" />
            <circle cx="16" cy="12" r="1.5" fill="currentColor" />
            <circle cx="8" cy="18" r="1.5" fill="currentColor" />
          </svg>
          <p style={{ margin: 0 }}>
            Add nodes and sequences to generate the sequence diagram.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bgColor || (isDark
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'),
      }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={fitViewOptions}
        proOptions={proOptions}
        minZoom={0.1}
        maxZoom={2}
      >
        {gridVisible && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color={dotColor}
          />
        )}
        <Controls
          showInteractive={false}
          style={{
            background: isDark
              ? 'rgba(30, 41, 59, 0.85)'
              : 'rgba(255, 255, 255, 0.85)',
            borderRadius: '10px',
            border: isDark
              ? '1px solid rgba(148, 163, 184, 0.15)'
              : '1px solid rgba(203, 213, 225, 0.5)',
            backdropFilter: 'blur(12px)',
            boxShadow: isDark
              ? '0 4px 16px rgba(0, 0, 0, 0.3)'
              : '0 4px 16px rgba(0, 0, 0, 0.08)',
          }}
        />
      </ReactFlow>
    </div>
  );
}

// ── Outer container with Provider ───────────────────────────────────────────
export const SequenceDiagramCanvas: React.FC = React.memo(function SequenceDiagramCanvas() {
  return (
    <ReactFlowProvider>
      <SeqFlowWrapper />
    </ReactFlowProvider>
  );
});
