import React from 'react';
import { useViewport } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';

export const RemoteCursorsOverlay: React.FC = () => {
  const isCollabActive = useAppStore((s) => s.isCollabActive);
  const collabPeers = useAppStore((s) => s.collabPeers);
  const { x: vpX, y: vpY, zoom } = useViewport();

  if (!isCollabActive) return null;

  const peers = Object.values(collabPeers);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Remote Cursors */}
      {peers.map((peer) => {
        if (!peer.cursor) return null;

        const screenX = vpX + peer.cursor.x * zoom;
        const screenY = vpY + peer.cursor.y * zoom;

        return (
          <div
            key={`cursor-${peer.peerId}`}
            className="absolute transition-transform duration-75 ease-out pointer-events-none flex items-start gap-1 select-none"
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
            }}
          >
            {/* SVG Pointer Arrow */}
            <svg
              className="w-5 h-5 -mt-0.5 -ml-0.5 drop-shadow-md"
              viewBox="0 0 24 24"
              fill={peer.color}
              stroke="white"
              strokeWidth="1.5"
            >
              <path d="M5.653 4.318a1 1 0 0 1 1.488-.135l12.43 11.23a1 1 0 0 1-.58 1.707l-4.992.593a1 1 0 0 0-.75.464l-2.613 4.267a1 1 0 0 1-1.74-.065L5.27 5.485a1 1 0 0 1 .383-1.167z" />
            </svg>

            {/* Peer Name Tag */}
            <div
              className="px-2 py-0.5 rounded-full text-[11px] font-medium text-white shadow-md whitespace-nowrap"
              style={{ backgroundColor: peer.color }}
            >
              {peer.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};
