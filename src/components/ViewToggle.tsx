import React from 'react';
import type { ViewMode } from '../types';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ mode, onChange }) => (
  <div className="flex rounded-xl border border-slate-200 overflow-hidden w-full sm:w-auto">
    <button
      onClick={() => onChange('map')}
      className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2 text-sm font-bold tracking-wider transition-colors ${mode === 'map'
          ? 'bg-[#111217] text-white'
          : 'bg-white text-slate-600 hover:bg-slate-50 active:bg-slate-100'
        }`}
    >
      КАРТА
    </button>
    <button
      onClick={() => onChange('list')}
      className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2 text-sm font-bold tracking-wider transition-colors ${mode === 'list'
          ? 'bg-[#111217] text-white'
          : 'bg-white text-slate-600 hover:bg-slate-50 active:bg-slate-100'
        }`}
    >
      СПИСОК
    </button>
  </div>
);

export default ViewToggle;
