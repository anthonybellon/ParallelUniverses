'use client';

import React, { Suspense, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import TerminalLog from '@components/organisms/TerminalLog';
import { JournalControls } from '@components/molecules/LogEntry';
import { useUniverseStore } from '@store/universeStore';
import { buildBook, getDivergenceRegister } from '@utils/book';
import {
  findEvent,
  getForkEvent,
  getRecentHistory,
} from '@utils/timelineGraph';
import { logHref, universeFromParam } from '@utils/routes';
import { aiHeaders } from '@utils/apiKey';
import { useUniverseMeta } from '@hooks/useUniverseMeta';

const toPromptEvent = (e: {
  name: string;
  date: string;
  description: string;
  timelineID: string;
}) => ({
  name: e.name,
  date: e.date,
  description: e.description,
  timelineID: e.timelineID,
});

function LogReader() {
  const params = useParams<{ locale: string; id: string }>();
  const searchParams = useSearchParams();
  const locale = params.locale ?? 'en';

  const events = useUniverseStore((s) => s.events);
  const hydrated = useUniverseStore((s) => s.hydrated);
  const aiAvailable = useUniverseStore((s) => s.aiAvailable);
  const bookPages = useUniverseStore((s) => s.bookPages);
  const setBookPage = useUniverseStore((s) => s.setBookPage);
  const editEvent = useUniverseStore((s) => s.editEvent);
  const setAiAvailable = useUniverseStore((s) => s.setAiAvailable);

  const meta = useUniverseMeta();
  const colors = useMemo(
    () =>
      Object.fromEntries(Object.entries(meta).map(([id, m]) => [id, m.color])),
    [meta],
  );
  const timelineID = universeFromParam(params.id ?? '', (id) => !!events[id]);
  const exists = !!events[timelineID];

  const log = useMemo(
    () => (exists ? buildBook(events, timelineID, locale) : null),
    [events, timelineID, locale, exists],
  );

  const fork = exists ? getForkEvent(events, timelineID) : undefined;
  const origin = fork
    ? { parent: fork.timelineID, eventName: fork.name, date: fork.date }
    : null;

  // Opened from an event: start at its record. Otherwise where the reader
  // left off.
  const eventParam = searchParams.get('event');
  const initialPage =
    log && eventParam && log.pageOfEvent[eventParam] !== undefined
      ? log.pageOfEvent[eventParam]
      : (bookPages[timelineID] ?? 0);

  const onPageChange = useCallback(
    (page: number) => setBookPage(timelineID, page),
    [setBookPage, timelineID],
  );

  // Each entry is generated once; repeat calls while one runs are ignored.
  const inFlight = useRef(new Set<string>());
  // Set once the AI can't be used at all (no key, or a rejected key), so the
  // other records stop asking and the reader gets one message, not dozens.
  const aiStopped = useRef(false);
  const pushToast = useUniverseStore((s) => s.pushToast);
  const stopAi = (message: string) => {
    if (aiStopped.current) return;
    aiStopped.current = true;
    pushToast({ message, tone: 'error' });
  };

  const controls = useMemo<JournalControls>(
    () => ({
      aiAvailable,
      saveJournal: (eventId, text) => {
        const result = editEvent(eventId, { journal: text });
        return result.ok ? null : result.error;
      },
      generateJournal: async (eventId) => {
        if (inFlight.current.has(eventId) || aiStopped.current) return null;
        const state = useUniverseStore.getState();
        const event = findEvent(state.events, eventId);
        if (!event) return 'That event no longer exists.';
        if (event.journal) return null;

        inFlight.current.add(eventId);
        try {
          const history = getRecentHistory(state.events, eventId, 6)
            .filter((h) => h.event.id !== eventId)
            .map((h) => toPromptEvent(h.event));
          const res = await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...aiHeaders() },
            body: JSON.stringify({
              event: toPromptEvent(event),
              universe: timelineID,
              history,
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (res.status === 503 || res.status === 401) {
            if (res.status === 503) setAiAvailable(false);
            stopAi(
              body.error ??
                'Personal logs are paused: no usable OpenAI API key.',
            );
            return null;
          }
          if (!res.ok || typeof body.journal !== 'string') {
            return body.error ?? 'The diary entry could not be written.';
          }
          const result = useUniverseStore
            .getState()
            .editEvent(eventId, { journal: body.journal });
          return result.ok ? null : result.error;
        } catch {
          return 'Could not reach the server. Check your connection and try again.';
        } finally {
          inFlight.current.delete(eventId);
        }
      },
    }),
    // stopAi only uses refs and the stable pushToast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aiAvailable, editEvent, setAiAvailable, timelineID],
  );

  const exit = <Link href={`/${locale}`}>[EXIT]</Link>;

  if (!hydrated) {
    return (
      <main className="terminal terminal--message">
        <p role="status">
          CONNECTING…
          <span className="log-cursor log-cursor--blink" aria-hidden="true" />
        </p>
      </main>
    );
  }

  if (!log) {
    return (
      <main className="terminal terminal--message">
        <h1>ERROR: NO UNIVERSE NAMED &quot;{timelineID}&quot;.</h1>
        <p>IT MAY HAVE BEEN DELETED.</p>
        <p>{exit}</p>
      </main>
    );
  }

  return (
    <main>
      <TerminalLog
        // Remount when the universe changes so the log opens in the right place.
        key={timelineID}
        log={log}
        initialPage={initialPage}
        onPositionChange={onPageChange}
        origin={origin}
        controls={controls}
        exit={exit}
        colors={colors}
        register={getDivergenceRegister(events, timelineID)}
        logHrefFor={(id) => logHref(locale, id)}
      />
    </main>
  );
}

export default function LogPage() {
  return (
    <Suspense
      fallback={
        <main className="terminal terminal--message">
          <p role="status">CONNECTING…</p>
        </main>
      }
    >
      <LogReader />
    </Suspense>
  );
}
