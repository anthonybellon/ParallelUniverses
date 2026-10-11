import { EventNode } from 'src/data/events';
import {
  buildBook,
  formatDiaryDate,
  formatLogDate,
  getDivergenceRegister,
  pageForYear,
  UNDATED_CHAPTER,
} from '@utils/book';
import { EventData } from '@utils/timelineGraph';

const ev = (
  id: string,
  timelineID: string,
  date: string,
  extra: Partial<EventNode> = {},
): EventNode => ({
  id,
  timelineID,
  date,
  name: `Event ${id}`,
  description: '',
  eventType: 'Continuation',
  ...extra,
});

/*
 * prime: p1 (1969-07-20) ─ p2 (1989-11-09) ─ p3 (1991)
 *                              └─ W: w1 (1989-11-09, splinter) ─ w2 (1989-11-09) ─ w3 (1995-03) ─ w4 (no date)
 *                                                       └─ X: x1 (1996, splinter)
 */
const data: EventData = {
  '1': [
    ev('p1', '1', '1969-07-20'),
    ev('p2', '1', '1989-11-09'),
    ev('p3', '1', '1991'),
  ],
  W: [
    ev('w1', 'W', '1989-11-09', { eventType: 'Splinter', parentID: 'p2' }),
    ev('w2', 'W', '1989-11-09'),
    ev('w3', 'W', '1995-03'),
    ev('w4', 'W', ''),
  ],
  X: [ev('x1', 'X', '1996', { eventType: 'Splinter', parentID: 'w3' })],
};

describe('formatDiaryDate', () => {
  it('writes full dates out with the weekday', () => {
    expect(formatDiaryDate('1989-11-09')).toBe('Thursday, November 9, 1989');
    expect(formatDiaryDate('1989-11-09', 'fr')).toBe('jeudi 9 novembre 1989');
  });

  it('keeps partial dates partial', () => {
    expect(formatDiaryDate('1995-03')).toBe('March 1995');
    expect(formatDiaryDate('1996')).toBe('1996');
  });

  it('shows free text as written', () => {
    expect(formatDiaryDate('Spring 1912')).toBe('Spring 1912');
    expect(formatDiaryDate('  ')).toBe('Undated');
  });
});

describe('formatLogDate', () => {
  it('stamps full dates with the weekday', () => {
    expect(formatLogDate('1989-11-09')).toBe('1989-11-09 THU');
    expect(formatLogDate('1969-7-20')).toBe('1969-07-20 SUN');
  });

  it('keeps anything else as written', () => {
    expect(formatLogDate('1995-03')).toBe('1995-03');
    expect(formatLogDate('Spring 1912')).toBe('Spring 1912');
    expect(formatLogDate(' ')).toBe('NO DATE');
  });
});

describe('buildBook', () => {
  const book = buildBook(data, 'W');
  const kinds = book.pages.map((p) =>
    p.kind === 'day'
      ? p.entries.map((e) => e.event.id).join('+')
      : p.kind === 'fork'
        ? `fork:${p.universe}`
        : p.kind,
  );

  it('opens with a title and contents, then the history in order', () => {
    expect(kinds).toEqual([
      'title',
      'contents',
      'p1',
      'p2',
      'fork:W',
      'w1+w2',
      'w3',
      'w4',
    ]);
  });

  it('marks the fork page with where the universe splits off', () => {
    const fork = book.pages[4];
    expect(fork).toMatchObject({
      kind: 'fork',
      universe: 'W',
      parent: '1',
      forkEvent: { id: 'p2' },
    });
  });

  it('notes which universe inherited entries come from', () => {
    const p2 = book.pages[3];
    expect(p2.kind === 'day' && p2.entries[0].inheritedFrom).toBe('1');
    const w1 = book.pages[5];
    expect(w1.kind === 'day' && w1.entries[0].inheritedFrom).toBeNull();
  });

  it('groups chapters by decade with undated entries last', () => {
    expect(book.chapters.map((c) => [c.title, c.page])).toEqual([
      ['The 1960s', 2],
      ['The 1980s', 3],
      ['The 1990s', 6],
      ['Undated', 7],
    ]);
    expect(book.chapters.at(-1)?.id).toBe(UNDATED_CHAPTER);
    const starts = book.pages.map((p) => 'chapterStart' in p && p.chapterStart);
    expect(starts).toEqual([
      false,
      false,
      true,
      true,
      false,
      false,
      true,
      true,
    ]);
  });

  it('gives each day a full date heading', () => {
    const day = book.pages[5];
    expect(day.kind === 'day' && day.heading).toBe(
      'Thursday, November 9, 1989',
    );
  });

  it('knows the page of every event', () => {
    expect(book.pageOfEvent).toEqual({
      p1: 2,
      p2: 3,
      w1: 5,
      w2: 5,
      w3: 6,
      w4: 7,
    });
  });

  it('adds a fork page for every universe in the lineage', () => {
    const nested = buildBook(data, 'X').pages.filter((p) => p.kind === 'fork');
    expect(nested.map((p) => p.kind === 'fork' && p.universe)).toEqual([
      'W',
      'X',
    ]);
  });

  it('has no fork page for a root universe', () => {
    const prime = buildBook(data, '1');
    expect(prime.pages.some((p) => p.kind === 'fork')).toBe(false);
    expect(prime.pages).toHaveLength(5);
  });
});

describe('pageForYear', () => {
  const book = buildBook(data, 'W');

  it('finds the first page in or after a year', () => {
    expect(pageForYear(book, 1989)).toBe(3);
    expect(pageForYear(book, 1990)).toBe(6);
    expect(pageForYear(book, 1900)).toBe(2);
  });

  it('goes to the last page for a year past the end', () => {
    expect(pageForYear(book, 2050)).toBe(book.pages.length - 1);
  });
});

describe('getDivergenceRegister', () => {
  // prime ─ W (from p2) ─ X (from w3)
  it('lists every split that led to a universe, earliest first', () => {
    const { lineage } = getDivergenceRegister(data, 'X');
    expect(lineage.map((p) => [p.parent, p.universe, p.forkEvent.id])).toEqual([
      ['1', 'W', 'p2'],
      ['W', 'X', 'w3'],
    ]);
    expect(lineage[0].start.id).toBe('w1');
  });

  it('lists every later divergence, at any depth', () => {
    expect(
      getDivergenceRegister(data, '1').later.map((p) => p.universe),
    ).toEqual(['W', 'X']);
    expect(
      getDivergenceRegister(data, 'W').later.map((p) => p.universe),
    ).toEqual(['X']);
  });

  it('has no lineage for the prime universe and nothing later for a leaf', () => {
    expect(getDivergenceRegister(data, '1').lineage).toEqual([]);
    expect(getDivergenceRegister(data, 'X').later).toEqual([]);
  });
});
