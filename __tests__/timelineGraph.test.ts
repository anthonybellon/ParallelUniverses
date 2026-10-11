import { EventNode } from 'src/data/events';
import {
  addEvent,
  buildTree,
  deleteEvent,
  deleteTimeline,
  editEvent,
  EventData,
  getEventDeleteBlocker,
  getEventLineageIds,
  getForkEvent,
  getLineage,
  getRecentHistory,
  getSplinters,
  getTimelineHistory,
  getTimelineMeta,
  newEventId,
  orderTimelines,
  sortEvents,
  toSortKey,
  validateNewEvent,
} from '@utils/timelineGraph';

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
 * prime:      p1 (1900) ─ p2 (1910) ─ p3 (1920) ─ p4 (1930)
 *                              └─ A:  a1 (1911, splinter) ─ a2 (1925)
 *                                            └─ B: b1 (1912, splinter) ─ b2 (1940)
 *                                         └─ C (from p3): c1 (1921, splinter)
 */
const data: EventData = {
  // Child universes listed before their parents on purpose.
  B: [
    ev('b2', 'B', '1940-01-01'),
    ev('b1', 'B', '1912-01-01', { eventType: 'Splinter', parentID: 'a1' }),
  ],
  A: [
    ev('a1', 'A', '1911-01-01', { eventType: 'Splinter', parentID: 'p2' }),
    ev('a2', 'A', '1925-01-01'),
  ],
  '1': [
    ev('p3', '1', '1920-01-01'),
    ev('p1', '1', '1900-01-01'),
    ev('p2', '1', '1910-01-01'),
    ev('p4', '1', '1930-01-01'),
  ],
  C: [ev('c1', 'C', '1921-01-01', { eventType: 'Splinter', parentID: 'p3' })],
};

describe('toSortKey', () => {
  it('orders ISO and partial dates', () => {
    expect(toSortKey('1969-07-20')).toBeLessThan(toSortKey('1969-07-21'));
    expect(toSortKey('1969')).toBeLessThan(toSortKey('1969-02'));
  });

  it('reads free text that starts with a date', () => {
    expect(toSortKey('1945-08-06 and 1945-08-09')).toBe(
      toSortKey('1945-08-06'),
    );
  });

  it('finds a year inside other text', () => {
    expect(toSortKey('Spring 1912')).toBeLessThan(toSortKey('1913-01-01'));
    expect(toSortKey('Spring 1912')).toBeGreaterThan(toSortKey('1911-12-31'));
  });

  it('puts undated events last instead of breaking the sort', () => {
    const sorted = sortEvents([
      ev('x', '1', 'someday'),
      ev('y', '1', '1950-01-01'),
      ev('z', '1', '1900-01-01'),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['z', 'y', 'x']);
  });
});

describe('structure', () => {
  it('finds the fork event of a universe', () => {
    expect(getForkEvent(data, 'A')?.id).toBe('p2');
    expect(getForkEvent(data, 'B')?.id).toBe('a1');
    expect(getForkEvent(data, '1')).toBeUndefined();
  });

  it('orders universes parents first, children by fork date', () => {
    expect(orderTimelines(data)).toEqual(['1', 'A', 'B', 'C']);
  });

  it('describes each universe', () => {
    const meta = getTimelineMeta(data);
    expect(meta.B).toMatchObject({
      parentTimelineID: 'A',
      forkEventID: 'a1',
      depth: 2,
    });
    expect(meta['1'].depth).toBe(0);
    expect(new Set(Object.values(meta).map((m) => m.color)).size).toBe(4);
  });

  it('lists the universes that split from an event', () => {
    expect(getSplinters(data, 'p2')).toEqual(['A']);
    expect(getSplinters(data, 'p1')).toEqual([]);
  });
});

describe('history', () => {
  it('inherits ancestor events up to each fork point', () => {
    const history = getTimelineHistory(data, 'B');
    expect(history.map((h) => h.event.id)).toEqual([
      'p1',
      'p2',
      'a1',
      'b1',
      'b2',
    ]);
    expect(history.find((h) => h.event.id === 'p1')?.inheritedFrom).toBe('1');
    expect(history.find((h) => h.event.id === 'a1')?.inheritedFrom).toBe('A');
    expect(history.find((h) => h.event.id === 'b2')?.inheritedFrom).toBeNull();
  });

  it('does not inherit events after the fork', () => {
    const ids = getTimelineHistory(data, 'A').map((h) => h.event.id);
    expect(ids).not.toContain('p3');
    expect(ids).toContain('a2');
  });

  it('groups lineage oldest ancestor first for the chart', () => {
    expect(getLineage(data, 'B').map((g) => g.map((e) => e.id))).toEqual([
      ['p1', 'p2'],
      ['a1'],
      ['b1', 'b2'],
    ]);
  });

  it('highlights only the path that leads to an event', () => {
    expect(Array.from(getEventLineageIds(data, 'a2')).sort()).toEqual([
      'a1',
      'a2',
      'p1',
      'p2',
    ]);
  });
});

describe('same-day ordering', () => {
  it('puts the fork before a universe that starts the same day', () => {
    const sameDay: EventData = {
      '1': [ev('p1', '1', '1900'), ev('p2', '1', '1963-11-22')],
      K: [
        ev('k1', 'K', '1963-11-22', { eventType: 'Splinter', parentID: 'p2' }),
      ],
    };
    expect(getTimelineHistory(sameDay, 'K').map((h) => h.event.id)).toEqual([
      'p1',
      'p2',
      'k1',
    ]);
  });
});

describe('getRecentHistory', () => {
  it('returns what leads up to an event, inherited events included', () => {
    const ids = getRecentHistory(data, 'b1').map((h) => h.event.id);
    expect(ids).toEqual(['p1', 'p2', 'a1', 'b1']);
  });

  it('leaves out later events in the same universe', () => {
    const ids = getRecentHistory(data, 'a1').map((h) => h.event.id);
    expect(ids).toEqual(['p1', 'p2', 'a1']);
  });

  it('keeps only the most recent events', () => {
    const ids = getRecentHistory(data, 'b2', 2).map((h) => h.event.id);
    expect(ids).toEqual(['b1', 'b2']);
  });

  it('returns nothing for an unknown event', () => {
    expect(getRecentHistory(data, 'nope')).toEqual([]);
  });
});

describe('buildTree', () => {
  it('attaches universes to their fork point whatever order they arrive in', () => {
    const roots = buildTree(Object.values(data));
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('p1');

    const p2 = roots[0].children[0];
    expect(p2.id).toBe('p2');
    expect(p2.children.map((c) => c.id).sort()).toEqual(['a1', 'p3']);
  });
});

describe('validateNewEvent', () => {
  const p2 = data['1'].find((e) => e.id === 'p2')!;
  const a2 = data.A.find((e) => e.id === 'a2')!;

  it('accepts events on or after where they branch from', () => {
    expect(
      validateNewEvent(data, {
        sourceEvent: p2,
        eventType: 'Splinter',
        date: '1910-01-01',
      }),
    ).toBeNull();
  });

  it('rejects a splinter dated before its fork point', () => {
    expect(
      validateNewEvent(data, {
        sourceEvent: p2,
        eventType: 'Splinter',
        date: '1905-01-01',
      }),
    ).toMatch(/before "Event p2"/);
  });

  it('rejects a continuation dated before the event it follows', () => {
    expect(
      validateNewEvent(data, {
        sourceEvent: a2,
        eventType: 'Continuation',
        date: '1915-01-01',
      }),
    ).toMatch(/before "Event a2"/);
  });

  it('rejects a date it cannot place', () => {
    expect(
      validateNewEvent(data, {
        sourceEvent: a2,
        eventType: 'Continuation',
        date: 'soon',
      }),
    ).toMatch(/can't be placed/);
  });
});

describe('deleting', () => {
  it('blocks deleting an event that a universe splits from', () => {
    expect(getEventDeleteBlocker(data, 'a1')).toMatch(/"B" branches off/);
    expect(deleteEvent(data, 'a1').ok).toBe(false);
  });

  it('blocks deleting built-in events', () => {
    expect(getEventDeleteBlocker(data, 'p4')).toMatch(/Built-in/);
    expect(getEventDeleteBlocker(data, 'a2', { events: ['a2'] })).toMatch(
      /Built-in/,
    );
  });

  it('blocks deleting the event that starts a universe', () => {
    expect(getEventDeleteBlocker(data, 'c1')).toMatch(/where "C" begins/);
  });

  it('deletes an ordinary event', () => {
    const result = deleteEvent(data, 'b2');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.B.map((e) => e.id)).toEqual(['b1']);
  });

  it('deletes a universe with everything that splits off from it', () => {
    const result = deleteTimeline(data, 'A');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.removedTimelines.sort()).toEqual(['A', 'B']);
      expect(Object.keys(result.data).sort()).toEqual(['1', 'C']);
    }
  });

  it('refuses to delete the prime or a protected universe', () => {
    expect(deleteTimeline(data, '1').ok).toBe(false);
    expect(deleteTimeline(data, 'A', { timelines: ['B'] }).ok).toBe(false);
  });

  it('does not change the original data', () => {
    const before = JSON.stringify(data);
    deleteTimeline(data, 'A');
    deleteEvent(data, 'b2');
    expect(JSON.stringify(data)).toBe(before);
  });
});

describe('bad data', () => {
  it('survives a cycle between universes', () => {
    const cyclic: EventData = {
      X: [ev('x1', 'X', '1900', { eventType: 'Splinter', parentID: 'y1' })],
      Y: [ev('y1', 'Y', '1900', { eventType: 'Splinter', parentID: 'x1' })],
    };
    expect(orderTimelines(cyclic).sort()).toEqual(['X', 'Y']);
    expect(getTimelineHistory(cyclic, 'X').length).toBe(2);
  });
});

describe('addEvent', () => {
  const p2 = data['1'].find((e) => e.id === 'p2')!;
  const a2 = data.A.find((e) => e.id === 'a2')!;
  const draft = {
    name: '  The Wall stands  ',
    date: '1915-03-01',
    description: 'Written by hand.',
  };

  it('starts a new universe from a splinter', () => {
    const result = addEvent(data, {
      sourceEvent: p2,
      eventType: 'Splinter',
      draft,
      newTimelineName: ' D ',
      id: 'd1',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event).toMatchObject({
      id: 'd1',
      timelineID: 'D',
      name: 'The Wall stands',
      parentID: 'p2',
      eventType: 'Splinter',
    });
    expect(getForkEvent(result.data, 'D')?.id).toBe('p2');
  });

  it('adds a continuation in date order', () => {
    const result = addEvent(data, {
      sourceEvent: a2,
      eventType: 'Continuation',
      draft: { ...draft, date: '1926' },
      id: 'a3',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.A.map((e) => e.id)).toEqual(['a1', 'a2', 'a3']);
      expect(result.event.parentID).toBeUndefined();
    }
  });

  it('needs a title and a universe name', () => {
    expect(
      addEvent(data, {
        sourceEvent: p2,
        eventType: 'Splinter',
        draft: { ...draft, name: ' ' },
        newTimelineName: 'D',
      }),
    ).toMatchObject({ ok: false, error: 'Give the event a title.' });
    expect(
      addEvent(data, { sourceEvent: p2, eventType: 'Splinter', draft }),
    ).toMatchObject({ ok: false, error: 'Name the new universe.' });
  });

  it('refuses a universe name that is taken', () => {
    const result = addEvent(data, {
      sourceEvent: p2,
      eventType: 'Splinter',
      draft,
      newTimelineName: 'A',
    });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/already exists/);
  });

  it('keeps the prime timeline unchanged', () => {
    const result = addEvent(data, {
      sourceEvent: p2,
      eventType: 'Continuation',
      draft,
    });
    expect(result.ok).toBe(false);
  });

  it('gives new events a UUID by default', () => {
    const result = addEvent(data, {
      sourceEvent: a2,
      eventType: 'Continuation',
      draft: { ...draft, date: '1926' },
    });
    expect(result.ok && result.event.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('makes UUIDs without crypto.randomUUID', () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: original.getRandomValues.bind(original) },
      configurable: true,
    });
    try {
      const a = newEventId();
      expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/);
      expect(newEventId()).not.toBe(a);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: original,
        configurable: true,
      });
    }
  });

  it('applies the date rules', () => {
    const result = addEvent(data, {
      sourceEvent: a2,
      eventType: 'Continuation',
      draft: { ...draft, date: '1920-01-01' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/before "Event a2"/);
  });
});

describe('editEvent', () => {
  const builtIn = { events: ['p1', 'p2', 'p3', 'p4'] };

  it('changes the text of an event', () => {
    const result = editEvent(data, 'a2', {
      name: ' Renamed ',
      description: 'New words.',
    });
    expect(result.ok && result.event).toMatchObject({
      id: 'a2',
      name: 'Renamed',
      description: 'New words.',
      date: '1925-01-01',
    });
  });

  it('keeps an event after the point its universe splits off', () => {
    const result = editEvent(data, 'a2', { date: '1905' });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/before "Event p2"/);
  });

  it('keeps an event after its universe begins', () => {
    const result = editEvent(data, 'a2', { date: '1910-06-01' });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/where its universe begins/);
  });

  it('keeps an event before the universes that split from it', () => {
    const result = editEvent(data, 'a1', { date: '1913' });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/"B" branches off/);
  });

  it('keeps a universe start before its other events', () => {
    const result = editEvent(data, 'c1', { date: '1950' });
    expect(result.ok).toBe(true);
    const moved = editEvent(data, 'a1', { date: '1911-06-01' });
    expect(moved.ok).toBe(true);
  });

  it('re-sorts the universe after a date change', () => {
    const withA3 = {
      ...data,
      A: [...data.A, ev('a3', 'A', '1930-01-01')],
    };
    const result = editEvent(withA3, 'a3', { date: '1920' });
    expect(result.ok && result.data.A.map((e) => e.id)).toEqual([
      'a1',
      'a3',
      'a2',
    ]);
  });

  it('only takes a diary entry for built-in events', () => {
    expect(editEvent(data, 'p2', { name: 'Nope' }, builtIn)).toMatchObject({
      ok: false,
      error: 'Built-in events cannot be edited.',
    });
    const result = editEvent(data, 'p2', { journal: ' Dear diary. ' }, builtIn);
    expect(result.ok && result.event.journal).toBe('Dear diary.');
  });

  it('removes an empty diary entry', () => {
    const withJournal = editEvent(data, 'a2', { journal: 'Text' });
    if (!withJournal.ok) throw new Error(withJournal.error);
    const cleared = editEvent(withJournal.data, 'a2', { journal: '  ' });
    expect(cleared.ok && 'journal' in cleared.event).toBe(false);
  });

  it('does not change the original data', () => {
    const before = JSON.stringify(data);
    editEvent(data, 'a2', { name: 'Changed', journal: 'Text' });
    expect(JSON.stringify(data)).toBe(before);
  });
});
