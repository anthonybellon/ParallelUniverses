import type { Edge, Node } from '@xyflow/react';
import { EventNode } from 'src/data/events';
import { TimelineMeta, TIMELINE_COLORS, toSortKey } from './timelineGraph';

/**
 * Lays universes out as horizontal swimlanes on a shared time axis: x is the
 * date, each universe gets its own lane, and a dashed edge joins a universe's
 * first event to the event it splits from.
 */

export const LANE_HEIGHT = 120;
export const PX_PER_YEAR = 44;
/** Closest two events in a lane may sit, so their labels don't collide. */
export const MIN_GAP = 136;
export const LABEL_WIDTH = 170;
const UNDATED_GAP = 96;

export interface EventNodeData extends Record<string, unknown> {
  event: EventNode;
  color: string;
  /** Not on the highlighted path. */
  dimmed: boolean;
  selected: boolean;
  /** Belongs to an ancestor of the universe being viewed. */
  inherited: boolean;
}

export interface LaneNodeData extends Record<string, unknown> {
  timelineID: string;
  color: string;
  inherited: boolean;
  width: number;
}

export interface TickNodeData extends Record<string, unknown> {
  year: number;
  /** Height of the guide line, across every lane. */
  height: number;
}

export type EventFlowNode = Node<EventNodeData, 'event'>;
export type LaneFlowNode = Node<LaneNodeData, 'lane'>;
export type TickFlowNode = Node<TickNodeData, 'tick'>;
export type FlowNode = EventFlowNode | LaneFlowNode | TickFlowNode;

export interface SwimlaneInput {
  /** One list of events per lane, top to bottom. */
  lanes: EventNode[][];
  meta?: Record<string, TimelineMeta>;
  /** Universe being viewed; other lanes are its ancestors. */
  focusTimeline?: string | null;
  highlightIds?: string[] | null;
  selectedEventId?: string | null;
}

export interface SwimlaneLayout {
  nodes: FlowNode[];
  edges: Edge[];
  /** Earliest and latest year on the axis, or null with no dated events. */
  years: { from: number; to: number } | null;
}

const startOfYear = (year: number) => {
  const d = new Date(Date.UTC(2000, 0, 1));
  d.setUTCFullYear(year);
  return d.getTime();
};

/** The date as a fractional year, so 1 July 1969 is about 1969.5. */
const yearOf = (date: string) => {
  const key = toSortKey(date);
  if (!Number.isFinite(key)) return null;
  const year = new Date(key).getUTCFullYear();
  const start = startOfYear(year);
  return year + (key - start) / (startOfYear(year + 1) - start);
};

export const buildSwimlaneLayout = ({
  lanes,
  meta = {},
  focusTimeline = null,
  highlightIds = null,
  selectedEventId = null,
}: SwimlaneInput): SwimlaneLayout => {
  const visible = lanes.filter((l) => l.length > 0);
  const years = visible
    .flat()
    .map((e) => yearOf(e.date))
    .filter((y): y is number => y !== null);
  const minYear = years.length ? Math.floor(Math.min(...years)) : 0;
  const maxYear = years.length ? Math.ceil(Math.max(...years)) : 0;
  const highlight = highlightIds ? new Set(highlightIds) : null;
  const viewingOne = !!focusTimeline && focusTimeline !== 'all';

  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];
  const position = new Map<string, number>();

  // One time axis shared by every lane. Each distinct date gets an x that
  // follows the calendar but is pushed right when the previous date is too
  // close, leaving room for as many events as any one lane has on that date.
  const perLaneCount = new Map<number, number>();
  visible.forEach((events) => {
    const counts = new Map<number, number>();
    events.forEach((e) => {
      const y = yearOf(e.date);
      if (y !== null) counts.set(y, (counts.get(y) ?? 0) + 1);
    });
    counts.forEach((n, y) =>
      perLaneCount.set(y, Math.max(n, perLaneCount.get(y) ?? 0)),
    );
  });
  const anchors: { year: number; x: number }[] = [];
  Array.from(perLaneCount.keys())
    .sort((a, b) => a - b)
    .forEach((year) => {
      const prev = anchors.at(-1);
      const timeX = (year - minYear) * PX_PER_YEAR;
      const x = prev
        ? Math.max(timeX, prev.x + perLaneCount.get(prev.year)! * MIN_GAP)
        : timeX;
      anchors.push({ year, x });
    });
  const anchorX = new Map(anchors.map((a) => [a.year, a.x]));
  const lastAnchor = anchors.at(-1);
  const datedEnd = lastAnchor
    ? lastAnchor.x + perLaneCount.get(lastAnchor.year)! * MIN_GAP
    : 0;

  /** Where a year falls on the axis, between the dates around it. */
  const axisX = (year: number) => {
    if (!anchors.length) return 0;
    if (year <= anchors[0].year) {
      return anchors[0].x - (anchors[0].year - year) * PX_PER_YEAR;
    }
    for (let i = 1; i < anchors.length; i++) {
      const [a, b] = [anchors[i - 1], anchors[i]];
      if (year <= b.year) {
        return a.x + ((year - a.year) / (b.year - a.year)) * (b.x - a.x);
      }
    }
    return lastAnchor!.x + (year - lastAnchor!.year) * PX_PER_YEAR;
  };

  let maxX = 0;
  const placed = visible.map((events, laneIndex) => {
    const timelineID = events[0].timelineID;
    const color =
      meta[timelineID]?.color ??
      TIMELINE_COLORS[laneIndex % TIMELINE_COLORS.length];
    const y = laneIndex * LANE_HEIGHT;
    const usedAtDate = new Map<number, number>();
    let undated = 0;
    const items = events.map((event) => {
      const year = yearOf(event.date);
      let x: number;
      if (year === null) {
        x = datedEnd + UNDATED_GAP + undated * MIN_GAP;
        undated += 1;
      } else {
        const n = usedAtDate.get(year) ?? 0;
        usedAtDate.set(year, n + 1);
        x = anchorX.get(year)! + n * MIN_GAP;
      }
      maxX = Math.max(maxX, x);
      position.set(event.id, x);
      return { event, x };
    });
    return { timelineID, color, y, items };
  });

  const laneWidth = maxX + LABEL_WIDTH + MIN_GAP * 2;

  placed.forEach(({ timelineID, color, y, items }) => {
    const inherited = viewingOne && timelineID !== focusTimeline;
    nodes.push({
      id: `lane:${timelineID}`,
      type: 'lane',
      position: { x: -LABEL_WIDTH - MIN_GAP, y: y - LANE_HEIGHT / 2 },
      data: { timelineID, color, inherited, width: laneWidth },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
      style: { width: laneWidth, height: LANE_HEIGHT },
    });

    items.forEach(({ event, x }, i) => {
      const dimmed = highlight ? !highlight.has(event.id) : false;
      nodes.push({
        id: event.id,
        type: 'event',
        position: { x, y },
        // Centred on its date and lane.
        origin: [0.5, 0.5],
        data: {
          event,
          color,
          dimmed,
          selected: event.id === selectedEventId,
          inherited,
        },
        draggable: false,
        selectable: false,
        // React Flow turns off pointer events on nodes that can't be
        // selected or dragged; these hold a button.
        style: { pointerEvents: 'all' },
      });
      if (i > 0) {
        const prev = items[i - 1].event;
        edges.push({
          id: `${prev.id}->${event.id}`,
          source: prev.id,
          target: event.id,
          sourceHandle: 'next',
          targetHandle: 'prev',
          type: 'straight',
          style: {
            stroke: color,
            strokeWidth: 3,
            opacity: dimmed ? 0.2 : 0.85,
          },
        });
      }
    });

    // A universe's first event hangs off the event it splits from.
    const first = items[0]?.event;
    if (first?.eventType === 'Splinter' && first.parentID) {
      if (position.has(first.parentID)) {
        const dimmed = highlight ? !highlight.has(first.id) : false;
        edges.push({
          id: `fork:${first.parentID}->${first.id}`,
          source: first.parentID,
          target: first.id,
          sourceHandle: 'fork',
          targetHandle: 'branch',
          type: 'default',
          style: {
            stroke: color,
            strokeWidth: 2,
            strokeDasharray: '6 4',
            opacity: dimmed ? 0.2 : 0.85,
          },
        });
      }
    }
  });

  // A marker at the start of each decade, as a time axis.
  if (years.length) {
    const height = placed.length * LANE_HEIGHT;
    for (let year = Math.ceil(minYear / 10) * 10; year <= maxYear; year += 10) {
      nodes.push({
        id: `tick:${year}`,
        type: 'tick',
        position: {
          x: axisX(year),
          y: -LANE_HEIGHT / 2 - 28,
        },
        origin: [0.5, 0],
        data: { year, height: height + 28 },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: -1,
      });
    }
  }

  return {
    nodes,
    edges,
    years: years.length ? { from: minYear, to: maxYear } : null,
  };
};
