import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const DragGhost: React.FC = () => {
  const pendingDrop = useAppStore((state) => state.pendingDrop);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pendingDrop) {
      setPos(null);
      return;
    }

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [pendingDrop]);

  if (!pendingDrop || !pos) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x + 12,
        top: pos.y + 12,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-lg opacity-80 whitespace-nowrap font-sans">
        + {pendingDrop.name}
      </div>
    </div>
  );
};
