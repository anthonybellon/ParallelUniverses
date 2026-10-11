import { EventNode } from 'src/data/events';
import {
  buildSwimlaneLayout,
  EventFlowNode,
  LANE_HEIGHT,
  MIN_GAP,
  PX_PER_YEAR,
} from '@utils/swimlaneLayout';
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
  ev('p2', '1', '1910-01-01'),
  ev('p3', '1', '1910-01-02'),
];
const branch = [
  ev('a1', 'A', '1920-01-01', { eventType: 'Splinter', parentID: 'p2' }),
  ev('a2', 'A', ''),
];
const meta = getTimelineMeta({ '1': prime, A: branch });

const eventNode = (
  nodes: ReturnType<typeof buildSwimlaneLayout>['nodes'],
  id: string,
) => nodes.find((n) => n.id === id) as EventFlowNode;

describe('buildSwimlaneLayout', () => {
  const layout = buildSwimlaneLayout({ lanes: [prime, branch], meta });

  it('puts each universe in its own lane', () => {
    expect(eventNode(layout.nodes, 'p1').position.y).toBe(0);
    expect(eventNode(layout.nodes, 'a1').position.y).toBe(LANE_HEIGHT);
    expect(
      layout.nodes.filter((n) => n.type === 'lane').map((n) => n.id),
    ).toEqual(['lane:1', 'lane:A']);
  });

  it('places events by date', () => {
    expect(eventNode(layout.nodes, 'p1').position.x).toBe(0);
    expect(eventNode(layout.nodes, 'p2').position.x).toBeCloseTo(
      10 * PX_PER_YEAR,
      0,
    );
    expect(eventNode(layout.nodes, 'a1').position.x).toBeCloseTo(
      20 * PX_PER_YEAR,
      0,
    );
    expect(layout.years).toEqual({ from: 1900, to: 1920 });
  });

  it('spaces events that are close in time', () => {
    const p2 = eventNode(layout.nodes, 'p2').position.x;
    expect(eventNode(layout.nodes, 'p3').position.x).toBe(p2 + MIN_GAP);
  });

  it('puts undated events at the end', () => {
    const a1 = eventNode(layout.nodes, 'a1').position.x;
    expect(eventNode(layout.nodes, 'a2').position.x).toBeGreaterThan(a1);
  });

  it('joins events in a lane and links a universe to its fork', () => {
    expect(layout.edges.map((e) => e.id)).toEqual([
      'p1->p2',
      'p2->p3',
      'a1->a2',
      'fork:p2->a1',
    ]);
    const fork = layout.edges.find((e) => e.id === 'fork:p2->a1')!;
    expect(fork.style?.stroke).toBe(meta.A.color);
  });

  it('dims everything off the highlighted path and marks the selection', () => {
    const highlighted = buildSwimlaneLayout({
      lanes: [prime, branch],
      meta,
      highlightIds: ['p1', 'p2', 'a1'],
      selectedEventId: 'a1',
    });
    expect(eventNode(highlighted.nodes, 'p3').data.dimmed).toBe(true);
    expect(eventNode(highlighted.nodes, 'a1').data).toMatchObject({
      dimmed: false,
      selected: true,
    });
  });

  it('marks ancestor lanes as inherited when viewing one universe', () => {
    const one = buildSwimlaneLayout({
      lanes: [prime, branch],
      meta,
      focusTimeline: 'A',
    });
    expect(eventNode(one.nodes, 'p1').data.inherited).toBe(true);
    expect(eventNode(one.nodes, 'a1').data.inherited).toBe(false);
  });

  it('lines up the same date across lanes', () => {
    const other = [
      ev('b1', 'B', '1910-01-01', { eventType: 'Splinter', parentID: 'p1' }),
    ];
    const shared = buildSwimlaneLayout({ lanes: [prime, other] });
    expect(eventNode(shared.nodes, 'b1').position.x).toBe(
      eventNode(shared.nodes, 'p2').position.x,
    );
  });

  it('spaces events on the same date in one lane', () => {
    const twins = [
      ev('t1', '1', '1950'),
      ev('t2', '1', '1950'),
      ev('t3', '1', '1951'),
    ];
    const result = buildSwimlaneLayout({ lanes: [twins] });
    const x = (id: string) => eventNode(result.nodes, id).position.x;
    expect(x('t2') - x('t1')).toBe(MIN_GAP);
    expect(x('t3') - x('t1')).toBe(2 * MIN_GAP);
  });

  it('marks decades on the same axis as the events', () => {
    const ticks = layout.nodes.filter((n) => n.type === 'tick');
    expect(ticks.map((t) => t.id)).toEqual([
      'tick:1900',
      'tick:1910',
      'tick:1920',
    ]);
    const tick1910 = ticks.find((t) => t.id === 'tick:1910')!;
    expect(tick1910.position.x).toBeCloseTo(
      eventNode(layout.nodes, 'p2').position.x,
      0,
    );
  });

  it('copes with nothing to show', () => {
    expect(buildSwimlaneLayout({ lanes: [[]] })).toEqual({
      nodes: [],
      edges: [],
      years: null,
    });
  });
});
