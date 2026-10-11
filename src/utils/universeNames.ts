import { PRIME_TIMELINE_ID } from './timelineGraph';

/**
 * How universes are named on screen. The prime universe keeps the ID "1" in
 * saved data and URLs; only its label changes.
 */

/** "Prime universe", or "Universe <name>". */
export const universeName = (id: string): string =>
  id === PRIME_TIMELINE_ID ? 'Prime universe' : `Universe ${id}`;

/** "Prime", or the universe's own name, for lists and lane labels. */
export const universeShortName = (id: string): string =>
  id === PRIME_TIMELINE_ID ? 'Prime' : id;
