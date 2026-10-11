'use client';

import React from 'react';
import { UNIVERSE_PALETTE } from '@utils/palette';

interface ColorPickerProps {
  /** Who the colour is for, read out to screen readers. */
  label: string;
  /** The colour shown now. */
  value: string;
  /** True when the colour was picked, not the default. */
  custom: boolean;
  /** A palette colour, or null for the default. */
  onChange: (color: string | null) => void;
}

/** Swatches from the readable palette, plus "auto" for the default colour. */
const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  custom,
  onChange,
}) => (
  <div
    role="group"
    aria-label={label}
    className="flex flex-wrap items-center gap-1.5"
  >
    {UNIVERSE_PALETTE.map((c) => {
      const on = value.toLowerCase() === c.value;
      return (
        <button
          key={c.value}
          type="button"
          aria-pressed={on && custom}
          aria-label={c.name}
          title={c.name}
          onClick={() => onChange(c.value)}
          className={`h-5 w-5 border-2 ${on ? 'border-foreground' : 'border-transparent'} hover:border-muted-foreground`}
          style={{
            backgroundColor: c.value,
            boxShadow: on ? `0 0 8px ${c.value}` : undefined,
          }}
        />
      );
    })}
    <button
      type="button"
      aria-pressed={!custom}
      onClick={() => onChange(null)}
      className={`ml-1 border px-1.5 font-display text-base uppercase leading-5 tracking-wider ${!custom ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-primary'}`}
    >
      Auto
    </button>
  </div>
);

export default ColorPicker;
