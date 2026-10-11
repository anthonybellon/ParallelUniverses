'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import TerminalSpinner from '@components/atoms/TerminalSpinner';
import { useUniverseStore } from '@store/universeStore';
import {
  API_KEY_HEADER,
  clearApiKey,
  loadApiKey,
  maskApiKey,
  saveApiKey,
} from '@utils/apiKey';

type Check = 'idle' | 'checking';

/** The header readout of whether AI is on, and with whose key. */
const statusText = (
  aiAvailable: boolean | null,
  userKeyHint: string | null,
  serverAi: boolean | null,
) => {
  if (userKeyHint) return `AI: YOUR KEY ${userKeyHint}`;
  if (serverAi) return 'AI: SERVER KEY';
  if (aiAvailable === null) return 'AI: CHECKING';
  return 'AI: OFFLINE';
};

/**
 * Lets people use their own OpenAI key. It is checked with OpenAI before it
 * is kept, stays in this browser, and goes to this app's server only with AI
 * requests.
 */
const ApiKeyDialog: React.FC = () => {
  const aiAvailable = useUniverseStore((s) => s.aiAvailable);
  const serverAi = useUniverseStore((s) => s.serverAi);
  const userKeyHint = useUniverseStore((s) => s.userKeyHint);
  const setUserKeyHint = useUniverseStore((s) => s.setUserKeyHint);
  const pushToast = useUniverseStore((s) => s.pushToast);

  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [remember, setRemember] = useState(false);
  const [check, setCheck] = useState<Check>('idle');
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  // Native <dialog> gives focus handling and Escape to close for free.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    } else if (!open && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [open]);

  const show = () => {
    setKey('');
    setError(null);
    setRemember(loadApiKey()?.remember ?? false);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    setCheck('checking');
    setError(null);
    try {
      const res = await fetch('/api/ai-key', {
        method: 'POST',
        headers: { [API_KEY_HEADER]: trimmed },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.valid) {
        setError(body.error ?? 'The key could not be checked.');
        return;
      }
      saveApiKey(trimmed, remember);
      setUserKeyHint(maskApiKey(trimmed));
      setKey('');
      setOpen(false);
      pushToast({
        message: remember
          ? 'Key saved on this device. AI is on.'
          : 'Key saved until you close the browser. AI is on.',
        tone: 'success',
      });
    } catch {
      setError('Could not reach the server to check the key.');
    } finally {
      setCheck('idle');
    }
  };

  const remove = () => {
    clearApiKey();
    setUserKeyHint(null);
    pushToast({
      message: 'Your key was removed from this browser.',
      tone: 'info',
    });
  };

  const status = statusText(aiAvailable, userKeyHint, serverAi);
  const on = !!userKeyHint || !!serverAi;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={show}
        aria-haspopup="dialog"
        className={on ? '' : 'border-alert/80 text-alert'}
      >
        <span
          aria-hidden="true"
          className={`mr-2 inline-block h-2 w-2 ${on ? 'bg-primary shadow-[0_0_6px_var(--phosphor)]' : 'bg-alert'}`}
        />
        {status}
        <span className="sr-only">. Change the API key</span>
      </Button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        className="w-[min(36rem,calc(100vw-2rem))] border border-primary/70 bg-card p-0 text-foreground shadow-[0_0_40px_rgb(0_0_0/0.9)] backdrop:bg-black/70"
      >
        {open && (
          <form onSubmit={save} className="space-y-4 p-5">
            <h2
              id={titleId}
              className="glow font-display text-2xl uppercase tracking-wider text-primary"
            >
              &gt; OpenAI API key
            </h2>

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">STATUS</dt>
              <dd className={on ? 'text-primary' : 'text-alert'}>
                {status.replace('AI: ', '')}
              </dd>
              <dt className="text-muted-foreground">SERVER</dt>
              <dd>
                {serverAi
                  ? 'This app has its own key. Yours is used instead when set.'
                  : 'This app has no key of its own.'}
              </dd>
            </dl>

            <div className="space-y-1">
              <Label htmlFor="api-key">Your OpenAI API key</Label>
              <Input
                id="api-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder={userKeyHint ? `Replace ${userKeyHint}` : 'sk-…'}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError(null);
                }}
                aria-describedby="api-key-help"
                aria-invalid={!!error}
              />
              <p id="api-key-help" className="text-xs text-muted-foreground">
                Create one at{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-primary"
                >
                  platform.openai.com/api-keys
                </a>
                . Calls are billed to your OpenAI account.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="mt-1 accent-[var(--phosphor)]"
              />
              <span>
                Remember on this device
                <span className="block text-xs text-muted-foreground">
                  Otherwise the key is forgotten when you close the browser.
                </span>
              </span>
            </label>

            <p className="border-l-2 border-alert/70 pl-3 text-xs text-muted-foreground">
              Your key stays in this browser. It is sent to this app&apos;s
              server only with AI requests, which pass it on to OpenAI. It is
              never stored on the server, in your universes, or in exports.
              Anyone with access to this browser could read a remembered key.
            </p>

            {check === 'checking' && (
              <p role="status" className="flex items-center gap-2 text-sm">
                <TerminalSpinner /> Checking the key with OpenAI…
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-alert">
                ! {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={!key.trim() || check === 'checking'}
              >
                Test and save
              </Button>
              {userKeyHint && (
                <Button type="button" variant="destructive" onClick={remove}>
                  Remove my key
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
};

export default ApiKeyDialog;
