import { EventNode } from 'src/data/events';
import { EventData, PRIME_TIMELINE_ID, sortEvents } from './timelineGraph';

/**
 * What gets saved: only what the user made. Built-in universes and events
 * come from timelines.json on every load, so updates to that file reach
 * people who already have saved data.
 *
 * Older saves stored everything, built-in data included. `mergeStoredData`
 * reads both shapes.
 */

/**
 * Reads one saved event, or returns null when it is malformed. Older saves
 * may use the retired `Embellish` type; those are read as continuations.
 */
export const normalizeEvent = (
  value: unknown,
  timelineID: string,
): EventNode | null => {
  if (!value || typeof value !== 'object') return null;
  const e = value as Record<string, unknown>;
  if (typeof e.id !== 'string' || typeof e.name !== 'string') return null;
  const parentID = typeof e.parentID === 'string' ? e.parentID : undefined;
  return {
    id: e.id,
    timelineID,
    name: e.name,
    date: typeof e.date === 'string' ? e.date : '',
    description: typeof e.description === 'string' ? e.description : '',
    eventType:
      e.eventType === 'Splinter' && parentID ? 'Splinter' : 'Continuation',
    ...(parentID && { parentID }),
    ...(typeof e.journal === 'string' && e.journal && { journal: e.journal }),
  };
};

/** Reads saved or imported universes, dropping anything malformed. */
export const parseEventData = (value: unknown): EventData => {
  const out: EventData = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  Object.entries(value as Record<string, unknown>).forEach(([id, events]) => {
    if (!Array.isArray(events)) return;
    out[id] = sortEvents(
      events
        .map((e) => normalizeEvent(e, id))
        .filter((e): e is EventNode => e !== null),
    );
  });
  return out;
};

const builtInEventIds = (builtIn: EventData) =>
  new Set(Object.values(builtIn).flatMap((events) => events.map((e) => e.id)));

/** Strips built-in universes and events, leaving what the user added. */
export const toStoredData = (
  data: EventData,
  builtIn: EventData,
): EventData => {
  const builtInIds = builtInEventIds(builtIn);
  const out: EventData = {};
  Object.entries(data).forEach(([id, events]) => {
    const own = events.filter((e) => !builtInIds.has(e.id));
    if (own.length || !builtIn[id]) out[id] = own;
  });
  return out;
};

/**
 * Diary entries written for built-in events, keyed by event ID. Built-in
 * events aren't saved, so their entries are kept apart.
 */
export const toStoredJournals = (
  data: EventData,
  builtIn: EventData,
): Record<string, string> => {
  const builtInIds = builtInEventIds(builtIn);
  const out: Record<string, string> = {};
  Object.values(data).forEach((events) =>
    events.forEach((e) => {
      if (e.journal && builtInIds.has(e.id)) out[e.id] = e.journal;
    }),
  );
  return out;
};

const applyJournals = (data: EventData, journals: unknown): EventData => {
  if (!journals || typeof journals !== 'object') return data;
  const entries = journals as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(data).map(([id, events]) => [
      id,
      events.map((e) => {
        const journal = entries[e.id];
        return typeof journal === 'string' && journal ? { ...e, journal } : e;
      }),
    ]),
  );
};

/**
 * Combines built-in data with what was saved. Anything malformed in the save
 * is skipped rather than breaking the page. The prime timeline always comes
 * from the built-in data because nobody can add to it.
 */
export const mergeStoredData = (
  builtIn: EventData,
  stored: unknown,
  builtInJournals?: unknown,
): EventData => {
  // A copy, so the built-in data itself is never changed.
  const merged: EventData = { ...applyJournals(builtIn, builtInJournals) };
  const builtInIds = builtInEventIds(builtIn);

  Object.entries(parseEventData(stored)).forEach(([id, events]) => {
    if (id === PRIME_TIMELINE_ID) return;
    const own = events.filter((e) => !builtInIds.has(e.id));
    if (merged[id]) {
      merged[id] = sortEvents([...merged[id], ...own]);
    } else if (own.length) {
      merged[id] = own;
    }
  });
  return merged;
};

/* ------------------------------------------------------------------ */
/* Export and import                                                   */
/* ------------------------------------------------------------------ */

export const EXPORT_FORMAT = 'parallel-universes';
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  userEvents: EventData;
  builtInJournals: Record<string, string>;
  /** Colours picked for universes. */
  universeColors?: Record<string, string>;
}

/** Everything the user made, ready to save as a JSON file. */
export const toExportFile = (
  data: EventData,
  builtIn: EventData,
  now = new Date(),
  universeColors: Record<string, string> = {},
): ExportFile => ({
  format: EXPORT_FORMAT,
  version: EXPORT_VERSION,
  exportedAt: now.toISOString(),
  userEvents: toStoredData(data, builtIn),
  builtInJournals: toStoredJournals(data, builtIn),
  ...(Object.keys(universeColors).length && { universeColors }),
});

export type ImportResult =
  | { ok: true; data: EventData; universes: number; events: number }
  | { ok: false; error: string };

/**
 * Adds the universes and events from an exported file. Nothing already here
 * is replaced: events whose IDs exist are skipped, so importing the same
 * file twice adds nothing the second time. Also reads the bare format that
 * older versions kept in local storage.
 */
export const importUserData = (
  current: EventData,
  builtIn: EventData,
  file: unknown,
): ImportResult => {
  if (!file || typeof file !== 'object' || Array.isArray(file)) {
    return {
      ok: false,
      error: 'This file is not a Parallel Universes export.',
    };
  }
  const f = file as Record<string, unknown>;
  const isExport = f.format === EXPORT_FORMAT;
  if (isExport && typeof f.version === 'number' && f.version > EXPORT_VERSION) {
    return {
      ok: false,
      error: 'This file comes from a newer version of the app.',
    };
  }
  const looksLikeData = Object.values(f).every(Array.isArray);
  if (!isExport && !looksLikeData) {
    return {
      ok: false,
      error: 'This file is not a Parallel Universes export.',
    };
  }

  const incoming = mergeStoredData(
    builtIn,
    isExport ? f.userEvents : f,
    isExport ? f.builtInJournals : undefined,
  );

  const existingIds = new Set(
    Object.values(current).flatMap((events) => events.map((e) => e.id)),
  );
  const builtInIds = builtInEventIds(builtIn);
  const next: EventData = { ...current };
  let universes = 0;
  let events = 0;

  Object.entries(incoming).forEach(([id, list]) => {
    const fresh = list.filter(
      (e) => !builtInIds.has(e.id) && !existingIds.has(e.id),
    );
    if (fresh.length) {
      if (!next[id]) universes += 1;
      next[id] = sortEvents([...(next[id] ?? []), ...fresh]);
      events += fresh.length;
      fresh.forEach((e) => existingIds.add(e.id));
    }
    // Diary entries for built-in events fill gaps but never overwrite.
    list.forEach((e) => {
      if (!e.journal || !builtInIds.has(e.id)) return;
      next[id] = next[id].map((mine) =>
        mine.id === e.id && !mine.journal
          ? { ...mine, journal: e.journal }
          : mine,
      );
    });
  });

  return { ok: true, data: next, universes, events };
};
