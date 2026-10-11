'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import LogEntry, { JournalControls } from '@components/molecules/LogEntry';
import {
  Book,
  DivergencePoint,
  DivergenceRegister,
  formatLogDate,
  pageForYear,
} from '@utils/book';
import Link from 'next/link';
import { usePrefersReducedMotion } from '@hooks/useMediaQuery';
import { universeName } from '@utils/universeNames';

interface TerminalLogProps {
  /** The universe's history, from buildBook. */
  log: Book;
  /** Where the universe splits off, for the header. */
  origin?: { parent: string; eventName: string; date: string } | null;
  /** Each universe's colour, shown as a small square beside its name. */
  colors?: Record<string, string>;
  /** The turning points to list at the top: lineage and later branches. */
  register?: DivergenceRegister;
  /** Link to another universe's log. */
  logHrefFor?: (timelineID: string) => string;
  /** Record to open at (a page index from buildBook). */
  initialPage?: number;
  /** Called with the record at the top of the screen as the reader scrolls. */
  onPositionChange?: (page: number) => void;
  controls?: JournalControls;
  /** Link back to the universes, shown in the command bar. */
  exit?: ReactNode;
}

const anchor = (page: number) => `log-${page}`;
/**
 * A record counts as being read once less than this much of it is left
 * above the top of the screen. More than the records' scroll margin, so the
 * record a jump lands on is the one remembered.
 */
const READING_LINE_PX = 40;
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * A universe's history as a log on an old computer terminal: one long record
 * you scroll from top to bottom, with an index of sections by decade and a
 * command line for jumping to a year.
 */
const TerminalLog: React.FC<TerminalLogProps> = ({
  log,
  origin,
  initialPage = 0,
  onPositionChange,
  controls,
  exit,
  colors = {},
  register,
  logHrefFor,
}) => {
  // All log text is phosphor green. Universe colours only appear as small
  // squares beside universe names, so they can still be told apart.
  const swatch = (id: string) =>
    colors[id] ? (
      <span
        aria-hidden="true"
        className="terminal__swatch"
        style={{ backgroundColor: colors[id] }}
      />
    ) : null;
  const reducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [command, setCommand] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const screen = useRef<HTMLDivElement>(null);

  const records = log.pages.flatMap((p) => (p.kind === 'day' ? p.entries : []));
  const inherited = records.filter((r) => r.inheritedFrom !== null).length;

  // Where each turning point is in this log, when it is in it at all.
  const pageOfPoint = (p: DivergencePoint, kind: 'lineage' | 'later') =>
    kind === 'lineage'
      ? log.pages.findIndex(
          (page) => page.kind === 'fork' && page.universe === p.universe,
        )
      : (log.pageOfEvent[p.forkEvent.id] ?? -1);

  // Later universes that split off a record in this log, by event.
  const branchesAt = new Map<string, DivergencePoint[]>();
  register?.later.forEach((p) => {
    if (log.pageOfEvent[p.forkEvent.id] === undefined) return;
    branchesAt.set(p.forkEvent.id, [
      ...(branchesAt.get(p.forkEvent.id) ?? []),
      p,
    ]);
  });

  const renderPoint = (p: DivergencePoint, kind: 'lineage' | 'later') => {
    const page = pageOfPoint(p, kind);
    return (
      <li key={`${kind}-${p.universe}`} className="terminal__point">
        <span className="terminal__stamp">
          [{formatLogDate(p.forkEvent.date)}]
        </span>{' '}
        <span className="terminal__point-name">
          {swatch(p.parent)}
          {universeName(p.parent).toUpperCase()}
        </span>{' '}
        <span aria-hidden="true">──&gt;</span>
        <span className="sr-only"> to </span>{' '}
        <span className="terminal__point-name">
          {swatch(p.universe)}
          {universeName(p.universe).toUpperCase()}
        </span>
        <span className="terminal__point-detail">
          AFTER &quot;{p.forkEvent.name.toUpperCase()}&quot;. FIRST RECORD:
          &quot;
          {p.start.name.toUpperCase()}&quot; [{formatLogDate(p.start.date)}]
        </span>
        <span className="terminal__point-actions">
          {page > 1 && (
            <button
              type="button"
              onClick={() => goTo(page, true)}
              aria-label={`Go to where ${universeName(p.universe)} splits off`}
            >
              [GO]
            </button>
          )}
          {logHrefFor && p.universe !== log.timelineID && (
            <Link
              href={logHrefFor(p.universe)}
              aria-label={`Open the log of ${universeName(p.universe)}`}
            >
              [OPEN LOG]
            </Link>
          )}
        </span>
      </li>
    );
  };

  const goTo = (page: number, smooth: boolean) => {
    const el = document.getElementById(anchor(page));
    if (!el) return;
    el.scrollIntoView?.({
      behavior: smooth && !reducedMotion ? 'smooth' : 'auto',
      block: 'start',
    });
    el.focus({ preventScroll: true });
  };

  // Open where the reader left off, or on the record they came for. Once
  // more after the terminal font loads, since the text reflows.
  useEffect(() => {
    if (initialPage <= 1) return;
    let cancelled = false;
    goTo(initialPage, false);
    document.fonts?.ready.then(() => {
      if (!cancelled) goTo(initialPage, false);
    });
    return () => {
      cancelled = true;
    };
    // Only when the log opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track which records are on screen, since they may ask the AI for a
  // personal log.
  useEffect(() => {
    const root = screen.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      setVisible((prev) => {
        const next = new Set(prev);
        entries.forEach((e) => {
          const page = Number((e.target as HTMLElement).dataset.page);
          if (e.isIntersecting) next.add(page);
          else next.delete(page);
        });
        return next;
      });
    });
    root
      .querySelectorAll<HTMLElement>('[data-page]')
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [log]);

  // Remember the record being read: the first one still on screen once
  // scrolling stops.
  useEffect(() => {
    const root = screen.current;
    if (!root || !onPositionChange) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const current = Array.from(
          root.querySelectorAll<HTMLElement>('[data-page]'),
        ).find((el) => el.getBoundingClientRect().bottom > READING_LINE_PX);
        if (current) onPositionChange(Number(current.dataset.page));
      }, 300);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [onPositionChange]);

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    const text = command.trim();
    const year = Number.parseInt(text.replace(/^goto\s*/i, ''), 10);
    if (!Number.isFinite(year)) {
      setReply(`UNKNOWN COMMAND "${text}". TYPE A YEAR, E.G. 1969.`);
      return;
    }
    const page = pageForYear(log, year);
    setReply(`JUMPING TO ${year}…`);
    setCommand('');
    goTo(page, true);
  };

  return (
    <div className="terminal">
      <div className="terminal__screen" ref={screen}>
        <header className="terminal__header">
          <p>PARALLEL UNIVERSE ARCHIVE · TERMINAL 7</p>
          <p>ESTABLISHING LINK… OK</p>
          <h1>{universeName(log.timelineID).toUpperCase()} :: CHRONICLE LOG</h1>
          <p>
            ORIGIN:{' '}
            {origin
              ? `BRANCHED FROM ${universeName(origin.parent).toUpperCase()} AFTER "${origin.eventName.toUpperCase()}" [${formatLogDate(origin.date)}]`
              : 'ROOT UNIVERSE'}
          </p>
          <p>
            RECORDS: {records.length}
            {inherited > 0 && ` (${inherited} INHERITED)`}
          </p>
        </header>

        {register && (
          <section
            aria-labelledby="divergence-register"
            className="terminal__register"
          >
            <h2 id="divergence-register">*** DIVERGENCE REGISTER ***</h2>
            <h3>LINEAGE</h3>
            {register.lineage.length ? (
              <ol>{register.lineage.map((p) => renderPoint(p, 'lineage'))}</ol>
            ) : (
              <p>ROOT UNIVERSE. RECORDED HISTORY, NO DIVERGENCE.</p>
            )}
            <h3>LATER DIVERGENCES ({register.later.length})</h3>
            {register.later.length ? (
              <ol>{register.later.map((p) => renderPoint(p, 'later'))}</ol>
            ) : (
              <p>NONE RECORDED. NO UNIVERSE HAS BRANCHED FROM THIS ONE YET.</p>
            )}
          </section>
        )}

        <nav aria-label="Index" className="terminal__index">
          <h2>INDEX</h2>
          {log.chapters.length === 0 ? (
            <p>NO RECORDS FOUND.</p>
          ) : (
            <ol>
              {log.chapters.map((c) => {
                const count = log.pages.filter(
                  (p) => p.kind === 'day' && p.chapterId === c.id,
                ).length;
                return (
                  <li key={c.id}>
                    <a
                      href={`#${anchor(c.page)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        goTo(c.page, true);
                      }}
                    >
                      [{pad2(c.number)}] {c.title.toUpperCase()}
                    </a>
                    <span className="terminal__dots" aria-hidden="true" />
                    <span>
                      {count} DAY{count === 1 ? '' : 'S'}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </nav>

        {log.pages.map((page, i) => {
          if (page.kind === 'title' || page.kind === 'contents') return null;
          const chapter = page.chapterStart
            ? log.chapters.find((c) => c.page === i)
            : undefined;
          return (
            <React.Fragment key={i}>
              {chapter && (
                <h2 className="terminal__section">
                  == SECTION {pad2(chapter.number)} ::{' '}
                  {chapter.title.toUpperCase()} ==
                </h2>
              )}
              {page.kind === 'fork' ? (
                <div
                  id={anchor(i)}
                  data-page={i}
                  tabIndex={-1}
                  role="note"
                  className="terminal__fork"
                >
                  <p>*** DIVERGENCE DETECTED ***</p>
                  <p>
                    {universeName(page.universe).toUpperCase()} SPLITS FROM{' '}
                    {universeName(page.parent).toUpperCase()} AFTER &quot;
                    {page.forkEvent.name.toUpperCase()}&quot; [
                    {formatLogDate(page.forkEvent.date)}]
                  </p>
                  <p>
                    {page.universe === log.timelineID
                      ? 'ALL RECORDS BELOW BELONG TO THIS UNIVERSE.'
                      : `RECORDS BELOW COME FROM ${universeName(page.universe).toUpperCase()}.`}
                  </p>
                </div>
              ) : (
                <article
                  id={anchor(i)}
                  data-page={i}
                  tabIndex={-1}
                  className="terminal__day"
                  aria-labelledby={`${anchor(i)}-time`}
                >
                  <h3 id={`${anchor(i)}-time`} className="terminal__stamp">
                    [{formatLogDate(page.entries[0].event.date)}]
                  </h3>
                  {page.entries.map((entry) => (
                    <React.Fragment key={entry.event.id}>
                      <LogEntry
                        entry={entry}
                        visible={visible.has(i)}
                        controls={controls}
                      />
                      {branchesAt.get(entry.event.id)?.map((p) => (
                        <p key={p.universe} className="terminal__branch">
                          &gt;&gt;&gt; BRANCH POINT: {swatch(p.universe)}
                          {universeName(p.universe).toUpperCase()} SPLITS OFF
                          HERE{' '}
                          {logHrefFor && (
                            <Link
                              href={logHrefFor(p.universe)}
                              aria-label={`Open the log of ${universeName(p.universe)}`}
                            >
                              [OPEN LOG]
                            </Link>
                          )}
                        </p>
                      ))}
                    </React.Fragment>
                  ))}
                </article>
              )}
            </React.Fragment>
          );
        })}

        <p className="terminal__end">
          &gt; END OF LOG.
          <span className="log-cursor log-cursor--blink" aria-hidden="true" />
        </p>
      </div>

      <form className="terminal__prompt" onSubmit={run}>
        <label htmlFor="terminal-command">&gt; GOTO YEAR</label>
        <input
          id="terminal-command"
          value={command}
          onChange={(e) => {
            setCommand(e.target.value);
            setReply(null);
          }}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="1969"
        />
        <button type="submit">[ENTER]</button>
        <span role="status" className="terminal__reply">
          {reply}
        </span>
        <span className="terminal__prompt-actions">
          <button type="button" onClick={() => window.print()}>
            [PRINT / PDF]
          </button>
          {exit}
        </span>
      </form>
    </div>
  );
};

export default TerminalLog;
