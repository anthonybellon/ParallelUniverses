'use client';

import React, { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '@hooks/useMediaQuery';

const FRAMES = ['|', '/', '-', '\\'];

/** A text spinner, the way old terminals showed work in progress. */
const TerminalSpinner: React.FC = () => {
  const reducedMotion = usePrefersReducedMotion();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(
      () => setFrame((f) => (f + 1) % FRAMES.length),
      120,
    );
    return () => clearInterval(timer);
  }, [reducedMotion]);
  return (
    <span aria-hidden="true" className="inline-block w-[1ch] font-mono">
      {reducedMotion ? '…' : FRAMES[frame]}
    </span>
  );
};

export default TerminalSpinner;
