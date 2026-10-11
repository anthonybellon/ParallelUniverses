'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HistoryEntry } from '@utils/timelineGraph';
import { cn } from '@utils/utils';
import { usePrefersReducedMotion } from '@hooks/useMediaQuery';
import { universeName } from '@utils/universeNames';

export interface JournalControls {
  /** Whether an OpenAI API key is set. Null while still checking. */
  aiAvailable: boolean | null;
  /**
   * Asks the AI for the personal log and saves it. Resolves to an error
   * message, or null once saved.
   */
  generateJournal: (eventId: string) => Promise<string | null>;
  /** Saves a personal log the user wrote. Resolves to an error message or null. */
  saveJournal: (eventId: string, text: string) => string | null;
}

interface LogEntryProps {
  entry: HistoryEntry;
  /** True while the record is on screen, so the AI may write a missing log. */
  visible: boolean;
  controls?: JournalControls;
  /** Sets the record's colour. */
  style?: React.CSSProperties;
}

/** Time to type out a newly written log, at most. */
const TYPE_MS = 2500;

/**
 * One event as a log record. Shows the first-person personal log when there
 * is one, and the event's description otherwise. With an API key the missing
 * log is written once, when the record first scrolls into view, and typed out.
 */
const LogEntry: React.FC<LogEntryProps> = ({
  entry,
  visible,
  controls,
  style,
}) => {
  const { event, inheritedFrom } = entry;
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<'idle' | 'writing' | 'done' | 'failed'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  // Characters of the personal log shown so far, or null for all of it.
  const [typed, setTyped] = useState<number | null>(null);
  const previousJournal = useRef(event.journal);

  const canGenerate = !!controls && controls.aiAvailable === true;
  const shouldGenerate =
    canGenerate && visible && !event.journal && status === 'idle';

  const generate = async () => {
    if (!controls) return;
    setStatus('writing');
    setError(null);
    const problem = await controls.generateJournal(event.id);
    // Each record is tried once on its own; after that only the reader
    // starts another try.
    if (problem) {
      setError(problem);
      setStatus('failed');
    } else {
      setStatus('done');
    }
  };

  useEffect(() => {
    if (shouldGenerate) void generate();
    // generate only depends on the event and controls, both covered here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldGenerate, event.id]);

  // Type out a personal log that arrives while the record is open.
  useEffect(() => {
    const before = previousJournal.current;
    previousJournal.current = event.journal;
    if (before || !event.journal || reducedMotion || editing) return;
    const length = event.journal.length;
    const duration = Math.min(TYPE_MS, length * 12);
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      setTyped(Math.ceil(length * progress));
      if (progress < 1) frame = requestAnimationFrame(step);
      else setTyped(null);
    });
    return () => {
      cancelAnimationFrame(frame);
      setTyped(null);
    };
    // Only when a log arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.journal]);

  const startEditing = () => {
    setDraft(event.journal ?? '');
    setError(null);
    setEditing(true);
  };

  const save = () => {
    if (!controls) return;
    const problem = controls.saveJournal(event.id, draft);
    if (problem) setError(problem);
    else setEditing(false);
  };

  const body = event.journal ?? event.description;
  const shown = typed === null ? body : body.slice(0, typed);

  return (
    <section
      className={cn('log-entry', inheritedFrom && 'log-entry--inherited')}
      aria-label={event.name}
      style={style}
    >
      <h4 className="log-entry__title">
        <span aria-hidden="true">&gt; </span>
        {event.name}
        {inheritedFrom && (
          <span className="log-entry__source">
            {' '}
            [SRC: {universeName(inheritedFrom).toUpperCase()}]
          </span>
        )}
      </h4>

      {editing ? (
        <div className="log-entry__editor">
          <label htmlFor={`journal-${event.id}`}>
            PERSONAL LOG FOR {event.name.toUpperCase()}
          </label>
          <textarea
            id={`journal-${event.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder="Type the log for this day…"
          />
          <div className="log-entry__actions">
            <button type="button" onClick={save}>
              [SAVE]
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              [CANCEL]
            </button>
          </div>
        </div>
      ) : (
        <div className="log-entry__body">
          {event.journal && <p className="log-entry__kind">PERSONAL LOG:</p>}
          {shown ? (
            shown.split(/\n{2,}/).map((paragraph, i, all) => (
              <p key={i}>
                {paragraph}
                {typed !== null && i === all.length - 1 && (
                  <span className="log-cursor" aria-hidden="true" />
                )}
              </p>
            ))
          ) : (
            <p className="log-entry__empty">NO DATA RECORDED.</p>
          )}
        </div>
      )}

      {controls && !editing && (
        <div className="log-entry__actions">
          {status === 'writing' && (
            <span role="status">RECEIVING PERSONAL LOG…</span>
          )}
          {status === 'failed' && canGenerate && (
            <button type="button" onClick={generate}>
              [RETRY]
            </button>
          )}
          <button type="button" onClick={startEditing}>
            {event.journal ? '[EDIT LOG]' : '[WRITE PERSONAL LOG]'}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="log-entry__error">
          ERROR: {error}
        </p>
      )}
    </section>
  );
};

export default LogEntry;
