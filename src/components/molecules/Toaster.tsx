'use client';

import React, { useEffect } from 'react';
import { Toast, useUniverseStore } from '@store/universeStore';

const DISMISS_MS = 5000;
const DISMISS_WITH_ACTION_MS = 9000;

const toneClass: Record<Toast['tone'], string> = {
  info: 'border-border text-foreground',
  success: 'border-primary text-primary',
  error: 'border-alert text-alert',
};

const tonePrefix: Record<Toast['tone'], string> = {
  info: '>',
  success: 'OK',
  error: 'ERR',
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const dismiss = useUniverseStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = setTimeout(
      () => dismiss(toast.id),
      toast.action ? DISMISS_WITH_ACTION_MS : DISMISS_MS,
    );
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <li
      className={`flex items-center gap-3 border bg-card px-4 py-3 text-sm shadow-[0_0_24px_rgb(0_0_0/0.8)] ${toneClass[toast.tone]}`}
    >
      <span aria-hidden="true" className="glow font-display text-lg">
        {tonePrefix[toast.tone]}
      </span>
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="border border-current px-2 font-display text-lg uppercase tracking-wider hover:bg-primary hover:text-primary-foreground"
          onClick={() => {
            dismiss(toast.id);
            toast.action!.onAction();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        className="text-lg leading-none opacity-60 hover:opacity-100"
        onClick={() => dismiss(toast.id)}
      >
        ×
      </button>
    </li>
  );
};

/** Short messages in the corner, in place of alert(). */
const Toaster: React.FC = () => {
  const toasts = useUniverseStore((s) => s.toasts);
  return (
    <div
      role="status"
      aria-live="polite"
      data-toaster=""
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-4"
    >
      <ul className="pointer-events-auto flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </ul>
    </div>
  );
};

export default Toaster;
