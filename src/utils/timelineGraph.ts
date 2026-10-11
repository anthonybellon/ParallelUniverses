import { EventDraft, EventNode } from 'src/data/events';
import { PALETTE_VALUES } from './palette';

/**
 * Branching-timeline logic.
 *
 * Universes (timelines) form a tree. A universe that splinters off another one
 * starts with a `Splinter` event whose `parentID` points at the event it
 * diverged from — its fork point. Everything in the parent universe up to and
 * including that fork point is the child's inherited history; events after it
 * belong to the parent only.
 *
 * Nothing here mutates its input. All functions are pure so they can be unit
 * tested and shared between the page, the chart and the forms.
 */

export type EventData = Record<string, EventNode[]>;

export const PRIME_TIMELINE_ID = '1';

/** Default universe colours, in the order universes get them. */
export const TIMELINE_COLORS = PALETTE_VALUES;

export interface TimelineMeta {
  id: string;
  /** Universe this one splintered from. Undefined for root universes. */
  parentTimelineID?: string;
  /** Event in the parent universe where this one diverges. */
  forkEventID?: string;
  /** 0 for a root universe, 1 for its children, and so on. */
  depth: number;
  color: string;
}

export interface HistoryEntry {
  event: EventNode;
  /** Universe the event was inherited from, or null if it belongs to the universe itself. */
  inheritedFrom: string | null;
}

export interface TreeNode extends EventNode {
  children: TreeNode[];
}

export type MutationResult =
  | { ok: true; data: EventData; removedTimelines: string[] }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

/**
 * Turns a date string into a number that can be sorted and compared.
 *
 * Handles ISO dates (`1969-07-20`), partial dates (`1969-07`, `1969`) and
 * free text that starts with or contains a year, such as
 * `1945-08-06 and 1945-08-09` or `Spring 1912`. Anything without a year sorts
 * last (`Infinity`) instead of breaking the sort the way `new Date()` → `NaN`
 * does.
 */
export const toSortKey = (date: string | undefined | null): number => {
  if (!date) return Number.POSITIVE_INFINITY;
  const trimmed = date.trim();

  const iso = /^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(trimmed);
  if (iso) {
    const year = Number(iso[1]);
    const month = iso[2] ? Number(iso[2]) - 1 : 0;
    const day = iso[3] ? Number(iso[3]) : 1;
    const d = new Date(Date.UTC(2000, month, day));
    d.setUTCFullYear(year);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) return parsed;

  const year = /\b(\d{4})\b/.exec(trimmed);
  if (year) return Date.UTC(Number(year[1]), 0, 1);

  return Number.POSITIVE_INFINITY;
};

export const isPlaceableDate = (date: string | undefined | null): boolean =>
  Number.isFinite(toSortKey(date));

export const compareEvents = (a: EventNode, b: EventNode): number => {
  const ka = toSortKey(a.date);
  const kb = toSortKey(b.date);
  if (ka === kb) return 0;
  return ka < kb ? -1 : 1;
};

/** Returns a chronologically sorted copy. Events with the same date keep their order. */
export const sortEvents = (events: EventNode[]): EventNode[] =>
  [...events].sort(compareEvents);

/* ------------------------------------------------------------------ */
/* Structure                                                           */
/* ------------------------------------------------------------------ */

export const findEvent = (
  data: EventData,
  eventId: string,
): EventNode | undefined => {
  for (const events of Object.values(data)) {
    const found = events.find((e) => e.id === eventId);
    if (found) return found;
  }
  return undefined;
};

/** The `Splinter` event that starts a universe and links it to its parent. */
export const getDivergenceEvent = (
  data: EventData,
  timelineID: string,
): EventNode | undefined =>
  sortEvents(data[timelineID] || []).find(
    (e) => e.eventType === 'Splinter' && !!e.parentID,
  );

/** The event in the parent universe that this universe splits off from. */
export const getForkEvent = (
  data: EventData,
  timelineID: string,
): EventNode | undefined => {
  const divergence = getDivergenceEvent(data, timelineID);
  if (!divergence?.parentID) return undefined;
  const fork = findEvent(data, divergence.parentID);
  if (!fork || fork.timelineID === timelineID) return undefined;
  return fork;
};

/** [timelineID, parent, grandparent, …] up to the root. Guards against cycles. */
export const getAncestorChain = (
  data: EventData,
  timelineID: string,
): string[] => {
  const chain: string[] = [];
  let current: string | undefined = timelineID;
  while (current && data[current] && !chain.includes(current)) {
    chain.push(current);
    current = getForkEvent(data, current)?.timelineID;
  }
  return chain;
};

/** Universes that split off directly from the given event. */
export const getSplinters = (data: EventData, eventId: string): string[] =>
  Object.keys(data).filter((id) => getForkEvent(data, id)?.id === eventId);

/** Universes ordered parents-first, each followed by its descendants (depth-first). */
export const orderTimelines = (data: EventData): string[] => {
  const ids = Object.keys(data);
  const parentOf = new Map<string, string | undefined>(
    ids.map((id) => [id, getForkEvent(data, id)?.timelineID]),
  );
  const forkKey = (id: string) =>
    toSortKey(getForkEvent(data, id)?.date ?? undefined);

  const byForkThenId = (a: string, b: string) =>
    forkKey(a) - forkKey(b) || a.localeCompare(b, undefined, { numeric: true });

  const out: string[] = [];
  const visit = (id: string) => {
    if (out.includes(id)) return;
    out.push(id);
    ids
      .filter((c) => parentOf.get(c) === id)
      .sort(byForkThenId)
      .forEach(visit);
  };

  const roots = ids
    .filter((id) => !parentOf.get(id))
    .sort((a, b) =>
      a === PRIME_TIMELINE_ID
        ? -1
        : b === PRIME_TIMELINE_ID
          ? 1
          : a.localeCompare(b, undefined, { numeric: true }),
    );
  roots.forEach(visit);
  // Anything left is part of a cycle in bad data; show it rather than drop it.
  ids.forEach(visit);
  return out;
};

/** Every universe that descends from the given one (children, grandchildren, …). */
export const getDescendantTimelines = (
  data: EventData,
  timelineID: string,
): string[] => {
  const out: string[] = [];
  const queue = [timelineID];
  while (queue.length) {
    const current = queue.shift()!;
    Object.keys(data)
      .filter((id) => !out.includes(id) && id !== timelineID)
      .filter((id) => getForkEvent(data, id)?.timelineID === current)
      .forEach((id) => {
        out.push(id);
        queue.push(id);
      });
  }
  return out;
};

export const getTimelineMeta = (
  data: EventData,
): Record<string, TimelineMeta> => {
  const meta: Record<string, TimelineMeta> = {};
  orderTimelines(data).forEach((id, index) => {
    const fork = getForkEvent(data, id);
    meta[id] = {
      id,
      parentTimelineID: fork?.timelineID,
      forkEventID: fork?.id,
      depth: getAncestorChain(data, id).length - 1,
      color: TIMELINE_COLORS[index % TIMELINE_COLORS.length],
    };
  });
  return meta;
};

/* ------------------------------------------------------------------ */
/* History (inheritance)                                               */
/* ------------------------------------------------------------------ */

/**
 * The full history of a universe: its own events plus everything it inherits
 * from its ancestors up to each fork point, in chronological order.
 */
export const getTimelineHistory = (
  data: EventData,
  timelineID: string,
): HistoryEntry[] => {
  const entries: { entry: HistoryEntry; level: number }[] = [];
  let cutoff = Number.POSITIVE_INFINITY;

  getAncestorChain(data, timelineID).forEach((id, level) => {
    (data[id] || []).forEach((event) => {
      if (level === 0 || toSortKey(event.date) <= cutoff) {
        entries.push({
          entry: { event, inheritedFrom: level === 0 ? null : id },
          level,
        });
      }
    });
    const fork = getForkEvent(data, id);
    if (fork) cutoff = Math.min(cutoff, toSortKey(fork.date));
  });

  // On the same date, older ancestors come first, so the event a universe
  // splits from always comes before the universe's own first event.
  return entries
    .sort(
      (a, b) =>
        compareEvents(a.entry.event, b.entry.event) || b.level - a.level,
    )
    .map((e) => e.entry);
};

/**
 * A universe's history grouped by the universe each event comes from,
 * oldest ancestor first. This is the shape the tree chart expects.
 */
export const getLineage = (
  data: EventData,
  timelineID: string,
): EventNode[][] => {
  const history = getTimelineHistory(data, timelineID);
  return getAncestorChain(data, timelineID)
    .reverse()
    .map((id) =>
      history.filter((h) => h.event.timelineID === id).map((h) => h.event),
    )
    .filter((events) => events.length > 0);
};

/** IDs of every event on the path that leads to the given event. */
export const getEventLineageIds = (
  data: EventData,
  eventId: string,
): Set<string> => {
  const event = findEvent(data, eventId);
  if (!event) return new Set();
  const key = toSortKey(event.date);
  const ids = getTimelineHistory(data, event.timelineID)
    .filter(
      (h) =>
        h.inheritedFrom !== null ||
        h.event.id === eventId ||
        toSortKey(h.event.date) <= key,
    )
    .map((h) => h.event.id);
  return new Set(ids);
};

/**
 * The events that lead up to and include the given one in its universe,
 * newest last, capped at `limit`. This is the context the AI gets so a new
 * event follows on from what already happened.
 */
export const getRecentHistory = (
  data: EventData,
  eventId: string,
  limit = 8,
): HistoryEntry[] => {
  const event = findEvent(data, eventId);
  if (!event) return [];
  const key = toSortKey(event.date);
  const history = getTimelineHistory(data, event.timelineID);
  const upTo = history.findIndex((h) => h.event.id === eventId);
  const before = history.filter((h, i) =>
    upTo === -1 ? toSortKey(h.event.date) <= key : i <= upTo,
  );
  return limit > 0 ? before.slice(-limit) : [];
};

/* ------------------------------------------------------------------ */
/* Chart tree                                                          */
/* ------------------------------------------------------------------ */

/**
 * Builds the nested structure ECharts' tree series needs. Each universe is a
 * chain of events; a universe's first event hangs off its fork point when that
 * event is present. Works regardless of the order the universes arrive in.
 */
export const buildTree = (timelines: EventNode[][]): TreeNode[] => {
  const nodeMap = new Map<string, TreeNode>();
  const sorted = timelines.map(sortEvents);

  sorted.forEach((events) =>
    events.forEach((event) => {
      if (!nodeMap.has(event.id))
        nodeMap.set(event.id, { ...event, children: [] });
    }),
  );

  const roots: TreeNode[] = [];
  sorted.forEach((events) => {
    if (!events.length) return;
    const forkParentID = events.find(
      (e) => e.eventType === 'Splinter' && e.parentID,
    )?.parentID;

    events.forEach((event, index) => {
      const node = nodeMap.get(event.id)!;
      if (index > 0) {
        nodeMap.get(events[index - 1].id)!.children.push(node);
        return;
      }
      const parent = forkParentID ? nodeMap.get(forkParentID) : undefined;
      if (parent && parent !== node) parent.children.push(node);
      else roots.push(node);
    });
  });

  return roots;
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export interface NewEventInput {
  /** The event the user picked as the starting point. */
  sourceEvent: EventNode;
  eventType: EventNode['eventType'];
  /** Date of the generated event. */
  date: string;
}

/**
 * Checks that a new event can sit where it is going. A splinter has to happen
 * on or after the event it splits from; a continuation has to come on or after
 * the event it follows and the point where its universe splits off.
 * Returns an error message, or null when the event is valid.
 */
export const validateNewEvent = (
  data: EventData,
  { sourceEvent, eventType, date }: NewEventInput,
): string | null => {
  if (!isPlaceableDate(date)) {
    return `The generated date "${date}" can't be placed in time. Try again, or ask for a specific year.`;
  }
  const key = toSortKey(date);

  const limits: EventNode[] = [sourceEvent];
  if (eventType === 'Continuation') {
    const fork = getForkEvent(data, sourceEvent.timelineID);
    if (fork) limits.push(fork);
  }

  const blocking = limits.find((limit) => key < toSortKey(limit.date));
  if (!blocking) return null;

  return eventType === 'Splinter'
    ? `The new universe would start on ${date}, before "${blocking.name}" (${blocking.date}) that it branches from. Try again so it starts on or after that date.`
    : `The new event is dated ${date}, before "${blocking.name}" (${blocking.date}). Events in a universe have to come after the point they follow. Try again.`;
};

/* ------------------------------------------------------------------ */
/* Adding                                                              */
/* ------------------------------------------------------------------ */

export interface AddEventInput {
  /** The event the user picked as the starting point. */
  sourceEvent: EventNode;
  eventType: EventNode['eventType'];
  draft: EventDraft;
  /** Required when eventType is Splinter. */
  newTimelineName?: string;
  /** ID for the new event. Defaults to a random UUID. */
  id?: string;
}

/**
 * A unique ID for a new event. `crypto.randomUUID` only exists in secure
 * contexts (https or localhost), so fall back to random bytes elsewhere.
 */
export const newEventId = (): string => {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(bytes);
  else bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256)));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10),
  ]
    .map((part) => part.join(''))
    .join('-');
};

export type AddResult =
  | { ok: true; data: EventData; event: EventNode }
  | { ok: false; error: string };

/**
 * Adds an event, whether the AI wrote it or the user did. A splinter starts a
 * new universe whose first event points back at the source event; a
 * continuation goes into the source event's own universe.
 */
export const addEvent = (
  data: EventData,
  { sourceEvent, eventType, draft, newTimelineName, id }: AddEventInput,
): AddResult => {
  const name = draft.name.trim();
  const date = draft.date.trim();
  const description = draft.description.trim();
  if (!name) return { ok: false, error: 'Give the event a title.' };

  const isSplinter = eventType === 'Splinter';
  const timelineID = isSplinter
    ? (newTimelineName ?? '').trim()
    : sourceEvent.timelineID;

  if (isSplinter && !timelineID) {
    return { ok: false, error: 'Name the new universe.' };
  }
  if (isSplinter && data[timelineID]) {
    return {
      ok: false,
      error: `A universe called "${timelineID}" already exists. Choose another name.`,
    };
  }
  if (!isSplinter && sourceEvent.timelineID === PRIME_TIMELINE_ID) {
    return {
      ok: false,
      error:
        'The prime universe stays as it is. Branch into a new universe instead.',
    };
  }

  const invalid = validateNewEvent(data, { sourceEvent, eventType, date });
  if (invalid) return { ok: false, error: invalid };

  const event: EventNode = {
    id: id ?? newEventId(),
    timelineID,
    name,
    date,
    description,
    eventType,
    // The splinter event links the new universe to its fork point.
    ...(isSplinter && { parentID: sourceEvent.id }),
  };

  return {
    ok: true,
    event,
    data: {
      ...data,
      [timelineID]: sortEvents([
        ...(isSplinter ? [] : data[timelineID] || []),
        event,
      ]),
    },
  };
};

/* ------------------------------------------------------------------ */
/* Editing                                                             */
/* ------------------------------------------------------------------ */

export type EventPatch = Partial<EventDraft> & { journal?: string };

export type EditResult =
  | { ok: true; data: EventData; event: EventNode }
  | { ok: false; error: string };

/**
 * Changes an event's text, date or diary entry. Built-in events only take a
 * diary entry. A new date has to keep the event after the point its universe
 * splits off, and before any universe that splits from it.
 */
export const editEvent = (
  data: EventData,
  eventId: string,
  patch: EventPatch,
  protectedIDs: ProtectedIDs = {},
): EditResult => {
  const event = findEvent(data, eventId);
  if (!event) return { ok: false, error: 'That event no longer exists.' };

  const builtIn =
    event.timelineID === PRIME_TIMELINE_ID ||
    asSet(protectedIDs.events).has(eventId);
  const { journal, ...draft } = patch;
  const changesDraft = Object.values(draft).some((v) => v !== undefined);
  if (builtIn && changesDraft) {
    return { ok: false, error: 'Built-in events cannot be edited.' };
  }

  const name = (draft.name ?? event.name).trim();
  const date = (draft.date ?? event.date).trim();
  const description = (draft.description ?? event.description).trim();
  if (!name) return { ok: false, error: 'Give the event a title.' };

  if (date !== event.date) {
    if (!isPlaceableDate(date)) {
      return {
        ok: false,
        error: `"${date}" can't be placed in time. Use YYYY-MM-DD or a year.`,
      };
    }
    const key = toSortKey(date);
    // A splinter can't come before the event it splits from; anything else
    // can't come before the point its universe splits off.
    const lower =
      event.eventType === 'Splinter' && event.parentID
        ? findEvent(data, event.parentID)
        : getForkEvent(data, event.timelineID);
    if (lower && lower.id !== eventId && key < toSortKey(lower.date)) {
      return {
        ok: false,
        error: `The event can't be dated before "${lower.name}" (${lower.date}).`,
      };
    }
    const divergence = getDivergenceEvent(data, event.timelineID);
    if (
      divergence &&
      divergence.id !== eventId &&
      key < toSortKey(divergence.date)
    ) {
      return {
        ok: false,
        error: `The event can't be dated before "${divergence.name}" (${divergence.date}), where its universe begins.`,
      };
    }
    if (divergence?.id === eventId) {
      const tooEarly = (data[event.timelineID] || []).find(
        (e) => e.id !== eventId && toSortKey(e.date) < key,
      );
      if (tooEarly) {
        return {
          ok: false,
          error: `"${tooEarly.name}" (${tooEarly.date}) would come before the universe begins. Move it first.`,
        };
      }
    }
    const splinter = getSplinters(data, eventId)
      .map((id) => getDivergenceEvent(data, id)!)
      .find((d) => toSortKey(d.date) < key);
    if (splinter) {
      return {
        ok: false,
        error: `"${splinter.timelineID}" branches off from this event on ${splinter.date}, so it can't move later than that.`,
      };
    }
  }

  const updated: EventNode = { ...event, name, date, description };
  if (journal !== undefined) {
    const text = journal.trim();
    if (text) updated.journal = text;
    else delete updated.journal;
  }

  return {
    ok: true,
    event: updated,
    data: {
      ...data,
      [event.timelineID]: sortEvents(
        data[event.timelineID].map((e) => (e.id === eventId ? updated : e)),
      ),
    },
  };
};

/* ------------------------------------------------------------------ */
/* Deleting                                                            */
/* ------------------------------------------------------------------ */

export interface ProtectedIDs {
  timelines?: Iterable<string>;
  events?: Iterable<string>;
}

const asSet = (ids?: Iterable<string>) => new Set(ids ?? []);

/** Why an event can't be deleted, or null if it can. */
export const getEventDeleteBlocker = (
  data: EventData,
  eventId: string,
  protectedIDs: ProtectedIDs = {},
): string | null => {
  const event = findEvent(data, eventId);
  if (!event) return 'That event no longer exists.';
  if (
    event.timelineID === PRIME_TIMELINE_ID ||
    asSet(protectedIDs.events).has(eventId)
  ) {
    return 'Built-in events cannot be deleted.';
  }
  const splinters = getSplinters(data, eventId);
  if (splinters.length) {
    const names = splinters.map((s) => `"${s}"`).join(', ');
    return `${names} ${splinters.length === 1 ? 'branches' : 'branch'} off from this event. Delete ${splinters.length === 1 ? 'that universe' : 'those universes'} first.`;
  }
  if (getDivergenceEvent(data, event.timelineID)?.id === eventId) {
    return `This is where "${event.timelineID}" begins. Delete the whole universe instead.`;
  }
  return null;
};

/** Why a universe can't be deleted, or null if it can. */
export const getTimelineDeleteBlocker = (
  data: EventData,
  timelineID: string,
  protectedIDs: ProtectedIDs = {},
): string | null => {
  if (!data[timelineID]) return 'That universe no longer exists.';
  if (
    timelineID === PRIME_TIMELINE_ID ||
    asSet(protectedIDs.timelines).has(timelineID)
  ) {
    return 'Built-in universes cannot be deleted.';
  }
  return null;
};

export const deleteEvent = (
  data: EventData,
  eventId: string,
  protectedIDs: ProtectedIDs = {},
): MutationResult => {
  const blocker = getEventDeleteBlocker(data, eventId, protectedIDs);
  if (blocker) return { ok: false, error: blocker };
  const event = findEvent(data, eventId)!;
  return {
    ok: true,
    data: {
      ...data,
      [event.timelineID]: data[event.timelineID].filter(
        (e) => e.id !== eventId,
      ),
    },
    removedTimelines: [],
  };
};

/** Deletes a universe together with every universe that splits off from it. */
export const deleteTimeline = (
  data: EventData,
  timelineID: string,
  protectedIDs: ProtectedIDs = {},
): MutationResult => {
  const blocker = getTimelineDeleteBlocker(data, timelineID, protectedIDs);
  if (blocker) return { ok: false, error: blocker };

  const removed = [timelineID, ...getDescendantTimelines(data, timelineID)];
  const protectedTimelines = asSet(protectedIDs.timelines);
  const stuck = removed.find((id) => protectedTimelines.has(id));
  if (stuck) {
    return {
      ok: false,
      error: `"${stuck}" branches off from this universe and is built in, so it can't be removed.`,
    };
  }

  const next: EventData = {};
  Object.entries(data).forEach(([id, events]) => {
    if (!removed.includes(id)) next[id] = events;
  });
  return { ok: true, data: next, removedTimelines: removed };
};
