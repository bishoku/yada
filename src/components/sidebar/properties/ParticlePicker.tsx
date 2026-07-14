/**
 * ParticlePicker.tsx
 *
 * Compact particle selector for the Edge Properties panel.
 * Shows a 5×2 grid of particle options with icon thumbnails.
 */
import React from 'react';
import { ParticlePickerIcon } from '../../canvas/ParticleSvg';
import { PARTICLE_DEFS, ParticleType, ParticleDef } from '../../../config/particles';

interface ParticlePickerProps {
  value: ParticleType;
  onChange: (type: ParticleType) => void;
  language?: string;
}

/**
 * ParticlePicker
 * Properties panel component: 5×2 icon grid picker
 */
export const ParticlePicker: React.FC<ParticlePickerProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-5 gap-1">
      {PARTICLE_DEFS.map((def: ParticleDef) => {
        const isSelected = value === def.id;
        return (
          <button
            key={def.id}
            title={def.label}
            onClick={() => onChange(def.id)}
            className={[
              'flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl cursor-pointer transition-all duration-150 border',
              isSelected
                ? 'border-2 shadow-sm scale-[1.05]'
                : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50',
            ].join(' ')}
            style={isSelected ? {
              borderColor: def.color,
              backgroundColor: def.color + '18',
              boxShadow: `0 0 8px ${def.color}44`,
            } : undefined}
          >
            <ParticlePickerIcon type={def.id} size={24} />
            <span
              className="text-[8px] font-bold leading-none"
              style={{ color: isSelected ? def.color : undefined }}
            >
              {def.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
