import { EventNode } from 'src/data/events';
import { TimelineMeta, TIMELINE_COLORS, toSortKey } from './timelineGraph';

/**
 * Lays universes out like a metro map for the scrolling view: one evenly
 * spaced column per date (not to scale), one lane per universe, and a curve
 * from the event a universe splits off at into its own lane.
 */

export const METRO = {
  laneHeight: 104,
  axisHeight: 52,
  columnWidth: 150,
  padLeft: 24,
  padRight: 60,
  /** How far a lane's line runs past its first and last stations. */
  overhang: 34,
} as const;

export interface MetroStation {
  event: EventNode;
  x: number;
  y: number;
  /** Another visible universe splits off here. */
  isFork: boolean;
}

export interface MetroLane {
  timelineID: string;
  color: string;
  y: number;
  /** SVG path for the lane's line, including the curve from its fork. */
  path: string;
  stations: MetroStation[];
}

export interface MetroColumn {
  x: number;
  /** The date as written, or "Undated". */
  label: string;
}

export interface MetroLayout {
  lanes: MetroLane[];
  columns: MetroColumn[];
  width: number;
  height: number;
}

const columnKey = (date: string) => {
  const key = toSortKey(date);
  return Number.isFinite(key) ? `d:${key}` : 'undated';
};

export const buildMetroLayout = (
  laneEvents: EventNode[][],
  meta: Record<string, TimelineMeta> = {},
): MetroLayout => {
  const { laneHeight, axisHeight, columnWidth, padLeft, padRight, overhang } =
    METRO;
  const visible = laneEvents.filter((l) => l.length > 0);
  const all = visible.flat();

  // Columns in date order, undated last. The label is the first way the date
  // is written among the events in that column.
  const keys = Array.from(new Set(all.map((e) => columnKey(e.date)))).sort(
    (a, b) => {
      if (a === 'undated') return 1;
      if (b === 'undated') return -1;
      return Number(a.slice(2)) - Number(b.slice(2));
    },
  );
  const index = new Map(keys.map((k, i) => [k, i]));
  const colX = (i: number) => padLeft + i * columnWidth + columnWidth / 2;
  const columns = keys.map((k, i) => ({
    x: colX(i),
    label:
      k === 'undated'
        ? 'Undated'
        : all.find((e) => columnKey(e.date) === k)!.date.trim(),
  }));

  const laneY = (i: number) => axisHeight + i * laneHeight + laneHeight / 2;
  const position = new Map<string, { x: number; y: number }>();
  visible.forEach((events, i) =>
    events.forEach((e) =>
      position.set(e.id, {
        x: colX(index.get(columnKey(e.date))!),
        y: laneY(i),
      }),
    ),
  );
  const forkIds = new Set(
    all
      .filter((e) => e.eventType === 'Splinter' && e.parentID)
      .map((e) => e.parentID!)
      .filter((id) => position.has(id)),
  );

  let maxX = padLeft + Math.max(keys.length, 1) * columnWidth;
  const lanes = visible.map((events, i): MetroLane => {
    const timelineID = events[0].timelineID;
    const color =
      meta[timelineID]?.color ?? TIMELINE_COLORS[i % TIMELINE_COLORS.length];
    const y = laneY(i);
    const xs = events.map((e) => position.get(e.id)!.x);
    const end = Math.max(...xs) + overhang;
    maxX = Math.max(maxX, end);

    const first = events[0];
    const fork =
      first.eventType === 'Splinter' && first.parentID
        ? position.get(first.parentID)
        : undefined;
    let path: string;
    const firstX = xs[0];
    if (fork && firstX <= fork.x) {
      // Starts on the same date it splits off: drop straight down into it.
      const mid = (fork.y + y) / 2;
      path =
        `M${fork.x} ${fork.y} C${fork.x} ${mid} ${firstX} ${mid} ${firstX} ${y} ` +
        `M${firstX} ${y} L${end} ${y}`;
    } else if (fork) {
      // Leave the parent's line at the fork and ease into this lane.
      const join = Math.min(fork.x + columnWidth * 0.5, firstX);
      path =
        `M${fork.x} ${fork.y} C${fork.x + columnWidth * 0.32} ${fork.y} ` +
        `${fork.x + columnWidth * 0.18} ${y} ${join} ${y} ` +
        `M${join} ${y} L${end} ${y}`;
    } else {
      path = `M${Math.min(...xs) - overhang} ${y} L${end} ${y}`;
    }

    return {
      timelineID,
      color,
      y,
      path,
      stations: events.map((event) => ({
        event,
        ...position.get(event.id)!,
        isFork: forkIds.has(event.id),
      })),
    };
  });

  return {
    lanes,
    columns,
    width: Math.max(maxX + padRight, 320),
    height: axisHeight + Math.max(lanes.length, 1) * laneHeight + 12,
  };
};
