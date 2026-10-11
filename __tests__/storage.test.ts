import { EventNode } from 'src/data/events';
import {
  importUserData,
  mergeStoredData,
  toExportFile,
  toStoredData,
  toStoredJournals,
} from '@utils/storage';
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

const builtIn: EventData = {
  '1': [ev('p1', '1', '1900'), ev('p2', '1', '1910')],
  '2': [ev('s1', '2', '1911', { eventType: 'Splinter', parentID: 'p2' })],
};

describe('toStoredData', () => {
  it('saves only what the user added', () => {
    const data: EventData = {
      ...builtIn,
      '2': [...builtIn['2'], ev('u1', '2', '1920')],
      Mine: [
        ev('m1', 'Mine', '1915', { eventType: 'Splinter', parentID: 'p2' }),
      ],
    };
    expect(toStoredData(data, builtIn)).toEqual({
      '2': [ev('u1', '2', '1920')],
      Mine: data.Mine,
    });
  });
});

describe('mergeStoredData', () => {
  it('loads an old save that copied the built-in data', () => {
    const oldSave = {
      '1': [ev('p1', '1', '1900', { name: 'Stale name' })],
      '2': [...builtIn['2'], ev('u1', '2', '1920')],
      Mine: [
        ev('m1', 'Mine', '1915', { eventType: 'Splinter', parentID: 'p2' }),
      ],
    };
    const merged = mergeStoredData(builtIn, oldSave);
    // Built-in data comes from the current file, not the save.
    expect(merged['1']).toEqual(builtIn['1']);
    expect(merged['2'].map((e) => e.id)).toEqual(['s1', 'u1']);
    expect(merged.Mine.map((e) => e.id)).toEqual(['m1']);
  });

  it('picks up new built-in events for existing users', () => {
    const updated: EventData = {
      ...builtIn,
      '1': [...builtIn['1'], ev('p3', '1', '1920')],
    };
    const save = toStoredData(
      { ...builtIn, Mine: [ev('m1', 'Mine', '1915')] },
      builtIn,
    );
    expect(mergeStoredData(updated, save)['1'].map((e) => e.id)).toEqual([
      'p1',
      'p2',
      'p3',
    ]);
  });

  it('round-trips user data', () => {
    const data: EventData = {
      ...builtIn,
      Mine: [
        ev('m1', 'Mine', '1915', { eventType: 'Splinter', parentID: 'p2' }),
      ],
    };
    expect(mergeStoredData(builtIn, toStoredData(data, builtIn))).toEqual(data);
  });

  it('never changes the built-in data', () => {
    const before = JSON.stringify(builtIn);
    mergeStoredData(builtIn, {
      '2': [ev('u1', '2', '1920')],
      Mine: [ev('m1', 'Mine', '1915')],
    });
    expect(JSON.stringify(builtIn)).toBe(before);
  });

  it('skips malformed saves and events', () => {
    expect(mergeStoredData(builtIn, null)).toEqual(builtIn);
    expect(mergeStoredData(builtIn, [1, 2])).toEqual(builtIn);
    const merged = mergeStoredData(builtIn, {
      Mine: [{ id: 'x' }, ev('m1', 'Mine', '1915'), 'junk'],
      Broken: 'not a list',
    });
    expect(merged.Mine.map((e) => e.id)).toEqual(['m1']);
    expect(merged.Broken).toBeUndefined();
  });
});

describe('diary entries', () => {
  it('keeps entries on user events and stores built-in ones apart', () => {
    const data: EventData = {
      ...builtIn,
      '1': [{ ...builtIn['1'][0], journal: 'Built-in entry' }, builtIn['1'][1]],
      Mine: [ev('m1', 'Mine', '1915', { journal: 'My entry' })],
    };
    const stored = toStoredData(data, builtIn);
    const journals = toStoredJournals(data, builtIn);
    expect(stored.Mine[0].journal).toBe('My entry');
    expect(journals).toEqual({ p1: 'Built-in entry' });

    const merged = mergeStoredData(builtIn, stored, journals);
    expect(merged['1'][0].journal).toBe('Built-in entry');
    expect(merged.Mine[0].journal).toBe('My entry');
  });
});

describe('export and import', () => {
  const mine = ev('m1', 'Mine', '1915', {
    eventType: 'Splinter',
    parentID: 'p2',
  });
  const data: EventData = {
    ...builtIn,
    '1': [{ ...builtIn['1'][0], journal: 'Built-in entry' }, builtIn['1'][1]],
    Mine: [mine],
  };

  it('exports only what the user made', () => {
    const file = toExportFile(data, builtIn, new Date('2026-01-01'));
    expect(file).toEqual({
      format: 'parallel-universes',
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      userEvents: { Mine: [mine] },
      builtInJournals: { p1: 'Built-in entry' },
    });
  });

  it('imports into a fresh app', () => {
    const file = JSON.parse(JSON.stringify(toExportFile(data, builtIn)));
    const result = importUserData(builtIn, builtIn, file);
    expect(result).toMatchObject({ ok: true, universes: 1, events: 1 });
    if (result.ok) expect(result.data).toEqual(data);
  });

  it('adds nothing when the same file is imported again', () => {
    const file = toExportFile(data, builtIn);
    const result = importUserData(data, builtIn, file);
    expect(result).toMatchObject({ ok: true, universes: 0, events: 0 });
    if (result.ok) expect(result.data).toEqual(data);
  });

  it('adds new events to a universe that exists', () => {
    const file = toExportFile(
      { ...data, Mine: [mine, ev('m2', 'Mine', '1920')] },
      builtIn,
    );
    const result = importUserData(data, builtIn, file);
    expect(result).toMatchObject({ ok: true, universes: 0, events: 1 });
    if (result.ok)
      expect(result.data.Mine.map((e) => e.id)).toEqual(['m1', 'm2']);
  });

  it('never overwrites a diary entry', () => {
    const theirs = toExportFile(
      {
        ...builtIn,
        '1': [{ ...builtIn['1'][0], journal: 'Theirs' }, builtIn['1'][1]],
      },
      builtIn,
    );
    const result = importUserData(data, builtIn, theirs);
    if (result.ok) expect(result.data['1'][0].journal).toBe('Built-in entry');
  });

  it('reads the old local storage format', () => {
    const result = importUserData(builtIn, builtIn, {
      ...builtIn,
      Mine: [mine],
    });
    expect(result).toMatchObject({ ok: true, universes: 1, events: 1 });
  });

  it('rejects files that are not exports', () => {
    expect(importUserData(builtIn, builtIn, [1, 2])).toMatchObject({
      ok: false,
    });
    expect(importUserData(builtIn, builtIn, { hello: 'world' })).toMatchObject({
      ok: false,
    });
    expect(
      importUserData(builtIn, builtIn, {
        format: 'parallel-universes',
        version: 99,
      }),
    ).toMatchObject({
      ok: false,
      error: expect.stringMatching(/newer version/),
    });
  });
});
