'use client';

import { useCallback } from 'react';
import { useUniverseStore } from '@store/universeStore';

/** Shows a toast with an Undo button that puts back the last delete. */
export const useUndoableToast = () => {
  const pushToast = useUniverseStore((s) => s.pushToast);
  const undoDelete = useUniverseStore((s) => s.undoDelete);

  return useCallback(
    (message: string) =>
      pushToast({
        message,
        tone: 'info',
        action: {
          label: 'Undo',
          onAction: () => {
            if (undoDelete()) {
              pushToast({ message: 'Restored.', tone: 'success' });
            } else {
              pushToast({
                message:
                  'That can no longer be undone because something changed since.',
                tone: 'error',
              });
            }
          },
        },
      }),
    [pushToast, undoDelete],
  );
};
