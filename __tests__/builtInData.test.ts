import timelinesJson from 'src/data/timelines.json';
import { builtInData } from 'src/data/builtIn';
import {
  findEvent,
  getDivergenceEvent,
  getForkEvent,
  isPlaceableDate,
  orderTimelines,
  PRIME_TIMELINE_ID,
  toSortKey,
} from '@utils/timelineGraph';

const raw = timelinesJson as Record<string, unknown[]>;

describe('built-in universes', () => {
  it('load without dropping anything', () => {
    Object.entries(raw).forEach(([id, events]) =>
      expect(builtInData[id]).toHaveLength(events.length),
    );
  });

  it('use unique event IDs', () => {
    const ids = Object.values(builtInData).flatMap((l) => l.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('give every event a date that can be placed', () => {
    Object.values(builtInData)
      .flat()
      .forEach((e) =>
        expect([e.id, isPlaceableDate(e.date)]).toEqual([e.id, true]),
      );
  });

  it('branch from an event that exists, on or after its date', () => {
    Object.keys(builtInData)
      .filter((id) => id !== PRIME_TIMELINE_ID)
      .forEach((id) => {
        const start = getDivergenceEvent(builtInData, id);
        expect([id, start?.parentID]).toEqual([id, expect.any(String)]);
        const fork = findEvent(builtInData, start!.parentID!);
        expect([id, !!fork]).toEqual([id, true]);
        expect(toSortKey(start!.date)).toBeGreaterThanOrEqual(
          toSortKey(fork!.date),
        );
        // Everything else in the universe comes after it begins.
        builtInData[id].forEach((e) =>
          expect(toSortKey(e.date)).toBeGreaterThanOrEqual(
            toSortKey(start!.date),
          ),
        );
      });
  });

  it('all grow out of the prime universe', () => {
    orderTimelines(builtInData)
      .filter((id) => id !== PRIME_TIMELINE_ID)
      .forEach((id) =>
        expect(getForkEvent(builtInData, id)?.timelineID).toBe(
          PRIME_TIMELINE_ID,
        ),
      );
  });
});
