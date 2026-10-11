'use client';

import { useEffect, useState } from 'react';

/**
 * Whether a media query matches. Returns `fallback` until it can check, and
 * wherever matchMedia doesn't exist (tests, old browsers).
 */
export const useMediaQuery = (query: string, fallback = false): boolean => {
  const [matches, setMatches] = useState(fallback);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};

/** True when the user asks for less motion, and wherever it can't be checked. */
export const usePrefersReducedMotion = (): boolean =>
  useMediaQuery('(prefers-reduced-motion: reduce)', true);
