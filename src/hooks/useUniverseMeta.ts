'use client';

import { useMemo } from 'react';
import { useUniverseStore } from '@store/universeStore';
import { getTimelineMeta, TimelineMeta } from '@utils/timelineGraph';
import { withColorOverrides } from '@utils/palette';

/** Each universe's parent, depth and colour, with the colours people picked. */
export const useUniverseMeta = (): Record<string, TimelineMeta> => {
  const events = useUniverseStore((s) => s.events);
  const colors = useUniverseStore((s) => s.universeColors);
  return useMemo(
    () => withColorOverrides(getTimelineMeta(events), colors),
    [events, colors],
  );
};
