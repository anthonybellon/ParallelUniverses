'use client';

import { useEffect } from 'react';
import { useUniverseStore } from '@store/universeStore';
import { loadApiKey, maskApiKey } from '@utils/apiKey';

/**
 * Loads saved universes from storage and checks whether AI generation is set
 * up. Runs once on the client, after the first render, so it matches what
 * the server rendered.
 */
export default function StoreHydrator() {
  useEffect(() => {
    void useUniverseStore.persist.rehydrate();

    const stored = loadApiKey();
    if (stored)
      useUniverseStore.getState().setUserKeyHint(maskApiKey(stored.key));

    let cancelled = false;
    const { setAiAvailable } = useUniverseStore.getState();
    fetch('/api/ai-status')
      .then((res) => (res.ok ? res.json() : { available: false }))
      .then((body: { available?: boolean }) => {
        if (!cancelled) setAiAvailable(Boolean(body.available));
      })
      .catch(() => {
        if (!cancelled) setAiAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
