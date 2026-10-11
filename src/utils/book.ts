import { EventNode } from 'src/data/events';
import {
  EventData,
  getAncestorChain,
  getDescendantTimelines,
  getDivergenceEvent,
  getForkEvent,
  getTimelineHistory,
  HistoryEntry,
  toSortKey,
} from './timelineGraph';

/**
 * Turns a universe's history into the pages of a diary: a title page, a
 * contents page, then one page per day, in chapters by decade. A marked page
 * shows each point where the universe (or one it inherits from) splits off.
 */

export interface Chapter {
  /** `1980s`, or `undated`. */
  id: string;
  title: string;
  number: number;
  /** Index of the chapter's first page. */
  page: number;
}

interface ContentPage {
  chapterId: string;
  /** True on the first page of a chapter, which shows its heading. */
  chapterStart: boolean;
  /** Year the page falls in, or null when undated. */
  year: number | null;
}

export type BookPage =
  | { kind: 'title' }
  | { kind: 'contents' }
  | (ContentPage & {
      kind: 'fork';
      /** The universe that begins here. */
      universe: string;
      /** The universe it splits from. */
      parent: string;
      forkEvent: EventNode;
    })
  | (ContentPage & {
      kind: 'day';
      /** Full date heading, or the date as written when it isn't a calendar date. */
      heading: string;
      entries: HistoryEntry[];
    });

export interface Book {
  timelineID: string;
  pages: BookPage[];
  chapters: Chapter[];
  /** Page index for each event in the book. */
  pageOfEvent: Record<string, number>;
}

export const UNDATED_CHAPTER = 'undated';

const yearOf = (date: string): number | null => {
  const key = toSortKey(date);
  return Number.isFinite(key) ? new Date(key).getUTCFullYear() : null;
};

const decadeOf = (year: number | null) =>
  year === null ? UNDATED_CHAPTER : `${Math.floor(year / 10) * 10}s`;

const chapterTitle = (id: string) =>
  id === UNDATED_CHAPTER ? 'Undated' : `The ${id}`;

/**
 * A date as a diary heading: "Thursday 9 November 1989" for a full date,
 * "November 1989" or "1989" for partial ones, and free text as written.
 */
export const formatDiaryDate = (date: string, locale = 'en'): string => {
  const trimmed = date.trim();
  if (!trimmed) return 'Undated';
  const m = /^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(trimmed);
  if (!m) return trimmed;

  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) - 1 : 0;
  const day = m[3] ? Number(m[3]) : 1;
  const d = new Date(Date.UTC(2000, month, day));
  d.setUTCFullYear(year);
  if (Number.isNaN(d.getTime())) return trimmed;

  const options: Intl.DateTimeFormatOptions = m[3]
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : m[2]
      ? { month: 'long', year: 'numeric' }
      : { year: 'numeric' };
  try {
    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: 'UTC',
    }).format(d);
  } catch {
    return trimmed;
  }
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * A date as a log timestamp: "1989-11-09 THU" for a full date, and the date
 * as written otherwise.
 */
export const formatLogDate = (date: string): string => {
  const trimmed = date.trim();
  if (!trimmed) return 'NO DATE';
  const m = /^(-?\d{1,6})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (!m) return trimmed;
  const d = new Date(Date.UTC(2000, Number(m[2]) - 1, Number(m[3])));
  d.setUTCFullYear(Number(m[1]));
  if (Number.isNaN(d.getTime())) return trimmed;
  const pad = (n: string, w: number) => n.padStart(w, '0');
  return `${pad(m[1], 4)}-${pad(m[2], 2)}-${pad(m[3], 2)} ${WEEKDAYS[d.getUTCDay()]}`;
};

/** Builds the pages of a universe's book. */
export const buildBook = (
  data: EventData,
  timelineID: string,
  locale = 'en',
): Book => {
  // Oldest ancestor first, so on the same date an inherited event comes
  // before the universe that splits off from it.
  const chain = getAncestorChain(data, timelineID).reverse();
  const sourceOf = (h: HistoryEntry) => h.inheritedFrom ?? timelineID;
  const history = getTimelineHistory(data, timelineID)
    .map((h, i) => ({ h, i }))
    .sort(
      (a, b) =>
        toSortKey(a.h.event.date) - toSortKey(b.h.event.date) ||
        chain.indexOf(sourceOf(a.h)) - chain.indexOf(sourceOf(b.h)) ||
        a.i - b.i,
    )
    .map(({ h }) => h);

  const pages: BookPage[] = [{ kind: 'title' }, { kind: 'contents' }];
  const chapters: Chapter[] = [];
  const pageOfEvent: Record<string, number> = {};

  const startPage = (year: number | null) => {
    const chapterId = decadeOf(year);
    const chapterStart = chapters.at(-1)?.id !== chapterId;
    if (chapterStart) {
      chapters.push({
        id: chapterId,
        title: chapterTitle(chapterId),
        number: chapters.length + 1,
        page: pages.length,
      });
    }
    return { chapterId, chapterStart, year };
  };

  let previousSource: string | null = null;
  history.forEach((entry) => {
    const source = sourceOf(entry);
    const year = yearOf(entry.event.date);

    if (source !== previousSource) {
      const fork = getForkEvent(data, source);
      if (fork && previousSource !== null) {
        pages.push({
          kind: 'fork',
          ...startPage(year),
          universe: source,
          parent: fork.timelineID,
          forkEvent: fork,
        });
      }
    }

    const last = pages.at(-1)!;
    const sameDay =
      last.kind === 'day' &&
      source === previousSource &&
      last.entries[0].event.date.trim() === entry.event.date.trim();
    if (sameDay) {
      last.entries.push(entry);
    } else {
      pages.push({
        kind: 'day',
        ...startPage(year),
        heading: formatDiaryDate(entry.event.date, locale),
        entries: [entry],
      });
    }
    pageOfEvent[entry.event.id] = pages.length - 1;
    previousSource = source;
  });

  return { timelineID, pages, chapters, pageOfEvent };
};

/** The first page in or after the given year, or the last page. */
export const pageForYear = (book: Book, year: number): number => {
  const index = book.pages.findIndex(
    (p) => 'year' in p && p.year !== null && p.year >= year,
  );
  return index === -1 ? Math.max(book.pages.length - 1, 0) : index;
};

/* ------------------------------------------------------------------ */
/* Divergence register                                                 */
/* ------------------------------------------------------------------ */

export interface DivergencePoint {
  /** The universe that begins here. */
  universe: string;
  /** The universe it splits from. */
  parent: string;
  /** The event in the parent it splits after. */
  forkEvent: EventNode;
  /** The first event of the new universe. */
  start: EventNode;
}

export interface DivergenceRegister {
  /** Every split that led to this universe, the earliest first. */
  lineage: DivergencePoint[];
  /** Every universe that branched off this one later, at any depth. */
  later: DivergencePoint[];
}

const divergencePoint = (
  data: EventData,
  universe: string,
): DivergencePoint | null => {
  const forkEvent = getForkEvent(data, universe);
  const start = getDivergenceEvent(data, universe);
  return forkEvent && start
    ? { universe, parent: forkEvent.timelineID, forkEvent, start }
    : null;
};

/**
 * The important turning points for a universe's log: where it (and each
 * universe before it) split off from the prime universe, and every
 * divergence that happened after it.
 */
export const getDivergenceRegister = (
  data: EventData,
  timelineID: string,
): DivergenceRegister => {
  const byDate = (a: DivergencePoint, b: DivergencePoint) =>
    toSortKey(a.forkEvent.date) - toSortKey(b.forkEvent.date) ||
    toSortKey(a.start.date) - toSortKey(b.start.date);

  const lineage = getAncestorChain(data, timelineID)
    .reverse()
    .map((id) => divergencePoint(data, id))
    .filter((p): p is DivergencePoint => p !== null);

  const later = getDescendantTimelines(data, timelineID)
    .map((id) => divergencePoint(data, id))
    .filter((p): p is DivergencePoint => p !== null)
    .sort(byDate);

  return { lineage, later };
};
