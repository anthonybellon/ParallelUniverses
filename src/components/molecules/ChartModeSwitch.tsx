'use client';

import React from 'react';
import { ChartMode } from '@store/universeStore';

const OPTIONS: { mode: ChartMode; label: string; help: string }[] = [
  { mode: 'free', label: 'Free move', help: 'Drag and zoom on a time scale' },
  {
    mode: 'scroll',
    label: 'Scroll',
    help: 'Lines side by side, scroll left to right',
  },
];

/** Picks how the chart is shown. */
const ChartModeSwitch: React.FC<{
  mode: ChartMode;
  onChange: (mode: ChartMode) => void;
}> = ({ mode, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Chart view"
    className="inline-flex border border-border p-0.5"
  >
    {OPTIONS.map((o) => (
      <button
        key={o.mode}
        type="button"
        role="radio"
        aria-checked={mode === o.mode}
        title={o.help}
        onClick={() => onChange(o.mode)}
        className={`px-3 py-0.5 font-display text-lg uppercase tracking-wider ${
          mode === o.mode
            ? 'bg-primary text-primary-foreground'
            : 'glow text-muted-foreground hover:text-primary'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export default ChartModeSwitch;
