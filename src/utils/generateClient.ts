import { EventDraft, EventNode, EventType } from 'src/data/events';
import { EventData, getForkEvent, getRecentHistory } from './timelineGraph';
import type { LogicCheckResult } from './logicCheck';
import { aiHeaders } from './apiKey';

export type GenerateOutcome =
  | { ok: true; draft: EventDraft }
  | { ok: false; error: string; code?: string };

export interface GenerateRequest {
  sourceEvent: EventNode;
  eventType: EventType;
  question: string;
  newTimelineName?: string;
}

const toPromptEvent = (e: EventNode) => ({
  name: e.name,
  date: e.date,
  description: e.description,
  timelineID: e.timelineID,
});

/**
 * Asks the server for the next event, sending the recent history of the
 * universe so the AI can stay consistent. Nothing is saved here.
 */
export const requestGeneratedEvent = async (
  data: EventData,
  { sourceEvent, eventType, question, newTimelineName }: GenerateRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<GenerateOutcome> => {
  try {
    const history = getRecentHistory(data, sourceEvent.id).map((h) =>
      toPromptEvent(h.event),
    );
    const res = await fetchImpl('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...aiHeaders() },
      body: JSON.stringify({
        event: toPromptEvent(sourceEvent),
        eventType,
        question,
        newTimelineName,
        history,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.draft) return { ok: true, draft: body.draft };
    return {
      ok: false,
      code: body.code,
      error:
        body.error ??
        (res.status === 503
          ? 'No OpenAI API key is set. Add one under "API key", or write the event yourself.'
          : 'The event could not be generated. Try again.'),
    };
  } catch {
    return {
      ok: false,
      error: 'Could not reach the server. Check your connection and try again.',
    };
  }
};

/* ------------------------------------------------------------------ */
/* Logic check                                                         */
/* ------------------------------------------------------------------ */

export type LogicOutcome =
  | { ok: true; result: LogicCheckResult }
  | { ok: false; error: string; code?: string };

export interface LogicCheckBody {
  universe: string;
  event: ReturnType<typeof toPromptEvent>;
  eventType: EventType;
  fork?: ReturnType<typeof toPromptEvent>;
  history: ReturnType<typeof toPromptEvent>[];
}

const HISTORY_FOR_CHECK = 9;

/** What to check for an event that is already saved. */
export const logicCheckForEvent = (
  data: EventData,
  event: EventNode,
): LogicCheckBody => {
  const fork = getForkEvent(data, event.timelineID);
  return {
    universe: event.timelineID,
    event: toPromptEvent(event),
    eventType: event.eventType,
    ...(fork && { fork: toPromptEvent(fork) }),
    history: getRecentHistory(data, event.id, HISTORY_FOR_CHECK + 1)
      .filter((h) => h.event.id !== event.id)
      .map((h) => toPromptEvent(h.event)),
  };
};

/** What to check for a draft that isn't saved yet. */
export const logicCheckForDraft = (
  data: EventData,
  sourceEvent: EventNode,
  eventType: EventType,
  draft: EventDraft,
  newUniverse?: string,
): LogicCheckBody => {
  const universe =
    eventType === 'Splinter'
      ? newUniverse?.trim() || 'New universe'
      : sourceEvent.timelineID;
  const fork =
    eventType === 'Splinter'
      ? sourceEvent
      : getForkEvent(data, sourceEvent.timelineID);
  return {
    universe,
    event: { ...draft, timelineID: universe },
    eventType,
    ...(fork && { fork: toPromptEvent(fork) }),
    history: getRecentHistory(data, sourceEvent.id, HISTORY_FOR_CHECK).map(
      (h) => toPromptEvent(h.event),
    ),
  };
};

/** Asks the server whether an event's timing and divergence make sense. */
export const requestLogicCheck = async (
  body: LogicCheckBody,
  fetchImpl: typeof fetch = fetch,
): Promise<LogicOutcome> => {
  try {
    const res = await fetchImpl('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...aiHeaders() },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.result) return { ok: true, result: json.result };
    return {
      ok: false,
      code: json.code,
      error: json.error ?? 'The event could not be checked. Try again.',
    };
  } catch {
    return {
      ok: false,
      error: 'Could not reach the server. Check your connection and try again.',
    };
  }
};
