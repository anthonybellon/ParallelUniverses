'use client';

import React, { useState } from 'react';
import { Button } from '@components/ui/button';
import TerminalSpinner from '@components/atoms/TerminalSpinner';
import { LogicOutcome } from '@utils/generateClient';
import type { LogicCheckResult } from '@utils/logicCheck';

interface LogicCheckProps {
  /** Runs the check. Called only when the reader asks. */
  run: () => Promise<LogicOutcome>;
  /** Why the check can't run yet, such as a missing title. */
  blocked?: string | null;
}

const VERDICT: Record<LogicCheckResult['verdict'], string> = {
  plausible: 'PLAUSIBLE',
  questionable: 'QUESTIONABLE',
  implausible: 'IMPLAUSIBLE',
};

/**
 * An optional AI check of whether an event's timing makes sense and whether
 * it follows from where its universe split off. It only advises; nothing is
 * changed or blocked.
 */
const LogicCheck: React.FC<LogicCheckProps> = ({ run, blocked }) => {
  const [state, setState] = useState<'idle' | 'checking'>('idle');
  const [result, setResult] = useState<LogicCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setState('checking');
    setError(null);
    const outcome = await run();
    setState('idle');
    if (outcome.ok) setResult(outcome.result);
    else {
      setResult(null);
      setError(outcome.error);
    }
  };

  const good = result?.verdict === 'plausible';

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={check}
        disabled={state === 'checking' || !!blocked}
        title={blocked ?? undefined}
        className="border-dashed border-border"
      >
        {result ? 'Check logic again' : 'Check logic'}
      </Button>

      {state === 'checking' && (
        <p role="status" className="flex items-center gap-2 text-xs">
          <TerminalSpinner /> Checking the timing and how it follows on…
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-alert">
          ! {error}
        </p>
      )}
      {result && state === 'idle' && (
        <section
          aria-label="Logic check"
          className={`space-y-1.5 border-l-2 pl-3 text-xs ${good ? 'border-primary' : 'border-alert'}`}
        >
          <p
            className={`font-display text-lg uppercase tracking-wider ${good ? 'text-primary' : 'text-alert'}`}
          >
            Logic check :: {VERDICT[result.verdict]}
          </p>
          {(
            [
              ['TIMING', result.timing],
              ['DIVERGENCE', result.divergence],
            ] as const
          ).map(([label, part]) => (
            <p key={label}>
              <span className={part.ok ? 'text-primary' : 'text-alert'}>
                [{part.ok ? 'OK' : '!!'}] {label}
              </span>{' '}
              {part.note}
            </p>
          ))}
          {result.suggestions.length > 0 && (
            <>
              <p className="text-muted-foreground">SUGGESTIONS</p>
              <ul className="list-none space-y-0.5">
                {result.suggestions.map((s, i) => (
                  <li key={i}>
                    <span aria-hidden="true">- </span>
                    {s}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-muted-foreground">
            Advice only. Nothing has been changed.
          </p>
        </section>
      )}
    </div>
  );
};

export default LogicCheck;
