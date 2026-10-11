import { EventNode } from 'src/data/events';
import { buildMetroLayout, METRO } from '@utils/metroLayout';
import { getTimelineMeta } from '@utils/timelineGraph';

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

const prime = [
  ev('p1', '1', '1900-01-01'),
  ev('p2', '1', '1910'),
  ev('p3', '1', '1950'),
];
const branch = [
  ev('a1', 'A', '1910', { eventType: 'Splinter', parentID: 'p2' }),
  ev('a2', 'A', ''),
];
const meta = getTimelineMeta({ '1': prime, A: branch });
const layout = buildMetroLayout([prime, branch], meta);
const station = (id: string) =>
  layout.lanes.flatMap((l) => l.stations).find((s) => s.event.id === id)!;

describe('buildMetroLayout', () => {
  it('gives each date its own evenly spaced column, undated last', () => {
    expect(layout.columns.map((c) => c.label)).toEqual([
      '1900-01-01',
      '1910',
      '1950',
      'Undated',
    ]);
    const gaps = layout.columns
      .slice(1)
      .map((c, i) => c.x - layout.columns[i].x);
    expect(new Set(gaps)).toEqual(new Set([METRO.columnWidth]));
  });

  it('lines up the same date across universes', () => {
    expect(station('a1').x).toBe(station('p2').x);
    expect(station('a1').y).toBe(station('p2').y + METRO.laneHeight);
  });

  it('marks stations a universe splits off at', () => {
    expect(station('p2').isFork).toBe(true);
    expect(station('p1').isFork).toBe(false);
  });

  it('curves a branch out of its fork', () => {
    const lane = layout.lanes[1];
    expect(lane.color).toBe(meta.A.color);
    expect(
      lane.path.startsWith(`M${station('p2').x} ${station('p2').y} C`),
    ).toBe(true);
  });

  it('draws a straight line for a universe whose fork is not shown', () => {
    const alone = buildMetroLayout([branch]);
    expect(alone.lanes[0].path).not.toContain('C');
  });

  it('sizes the drawing to fit', () => {
    expect(layout.width).toBeGreaterThan(station('a2').x);
    expect(layout.height).toBe(METRO.axisHeight + 2 * METRO.laneHeight + 12);
  });

  it('copes with nothing to show', () => {
    expect(buildMetroLayout([[]]).lanes).toEqual([]);
  });
});

describe('fork curves', () => {
  it('drops straight down when a universe starts on its fork date', () => {
    const same = [
      ev('s1', 'S', '1910', { eventType: 'Splinter', parentID: 'p2' }),
    ];
    const l = buildMetroLayout([prime, same]);
    const fork = l.lanes[0].stations[1];
    const start = l.lanes[1].stations[0];
    expect(start.x).toBe(fork.x);
    expect(l.lanes[1].path.startsWith(`M${fork.x} ${fork.y} C${fork.x} `)).toBe(
      true,
    );
  });

  it('eases sideways into a universe that starts later', () => {
    const later = [
      ev('s1', 'S', '1950', { eventType: 'Splinter', parentID: 'p1' }),
    ];
    const l = buildMetroLayout([prime, later]);
    const fork = l.lanes[0].stations[0];
    expect(l.lanes[1].path).toContain(
      `C${fork.x + METRO.columnWidth * 0.32} ${fork.y}`,
    );
  });
});
