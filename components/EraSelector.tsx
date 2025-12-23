import React from 'react';
import { Era } from '../types';
import { HISTORICAL_ERAS } from '../constants';

interface EraSelectorProps {
  onSelect: (era: Era) => void;
}

export const EraSelector: React.FC<EraSelectorProps> = ({ onSelect }) => {
  return (
    <div className="p-6 pb-24 overflow-y-auto h-full bg-slate-900">
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-6 text-center">
        Choose Your Destination
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {HISTORICAL_ERAS.map((era) => (
          <button
            key={era.id}
            onClick={() => onSelect(era)}
            className={`
              relative overflow-hidden group rounded-xl p-1 text-left transition-all hover:scale-[1.02]
              bg-gradient-to-br ${era.color}
            `}
          >
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
            <div className="relative bg-slate-900/90 h-full p-4 rounded-lg backdrop-blur-sm border border-white/10 group-hover:border-white/30">
              <div className="text-4xl mb-3">{era.icon}</div>
              <h3 className="text-xl font-bold text-white mb-1">{era.name}</h3>
              <p className="text-sm text-slate-300">{era.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
