'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { EventNode } from 'src/data/events';
import { TimelineMeta } from '@utils/timelineGraph';
import { buildMetroLayout, METRO } from '@utils/metroLayout';
import { LABEL_CHARS, wrapLabel } from '@utils/wrapLabel';
import { usePrefersReducedMotion } from '@hooks/useMediaQuery';
import { universeName, universeShortName } from '@utils/universeNames';

interface MetroChartProps {
  /** One list of events per lane, top to bottom. */
  lanes: EventNode[][];
  meta?: Record<string, TimelineMeta>;
  focusTimeline?: string | null;
  highlightIds?: string[] | null;
  selectedEventId?: string | null;
  onSelectEvent: (eventId: string | null) => void;
  onSelectUniverse: (timelineID: string) => void;
}

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/**
 * Universes as metro lines that scroll sideways, one column per date, with
 * the universe names fixed on the left. Click a station to select its event,
 * or a universe name to view that universe.
 */
const MetroChart: React.FC<MetroChartProps> = ({
  lanes,
  meta = {},
  focusTimeline,
  highlightIds,
  selectedEventId,
  onSelectEvent,
  onSelectUniverse,
}) => {
  const layout = useMemo(() => buildMetroLayout(lanes, meta), [lanes, meta]);
  const scroller = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const highlight = highlightIds ? new Set(highlightIds) : null;
  const viewingOne = !!focusTimeline && focusTimeline !== 'all';

  // A new set of lanes opens where the viewed universe begins, or on the
  // latest events when there is no single universe to start from.
  const signature = lanes
    .map((l) => `${l[0]?.timelineID}:${l.length}`)
    .join('|');
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const own = layout.lanes.find((l) => l.timelineID === focusTimeline);
    const firstOwn = own?.stations[0];
    const target =
      viewingOne && firstOwn && own !== layout.lanes[0]
        ? firstOwn.x - el.clientWidth / 3
        : layout.width;
    el.scrollLeft = Math.max(0, target);
    // Only when the lanes change, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Keep the selected station in view.
  useEffect(() => {
    if (!selectedEventId || !scroller.current) return;
    const station = scroller.current.querySelector<SVGGElement>(
      `[data-event="${CSS.escape(selectedEventId)}"]`,
    );
    station?.scrollIntoView?.({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [selectedEventId, reducedMotion]);

  const { laneHeight, axisHeight } = METRO;

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="border-r bg-card/80">
          <div
            className="flex items-end border-b px-3 pb-2 font-display text-lg uppercase tracking-wider text-muted-foreground"
            style={{ height: axisHeight }}
          >
            Universes
          </div>
          {layout.lanes.map((lane) => {
            const on = focusTimeline === lane.timelineID;
            const inherited = viewingOne && !on;
            return (
              <button
                key={lane.timelineID}
                type="button"
                onClick={() => onSelectUniverse(lane.timelineID)}
                aria-pressed={on}
                aria-label={`${universeName(lane.timelineID)}${inherited ? ' (inherited)' : ''}`}
                title={universeName(lane.timelineID)}
                className={`flex w-full min-w-0 items-center gap-2 border-b border-border/50 px-3 text-left hover:bg-accent ${on ? 'bg-accent' : ''}`}
                style={{ height: laneHeight }}
              >
                <span
                  aria-hidden="true"
                  className="h-7 w-1.5 flex-none"
                  style={{ backgroundColor: lane.color }}
                />
                <span className="flex min-w-0 flex-col leading-tight">
                  <b
                    className={`glow truncate font-display text-xl uppercase tracking-wide ${on ? 'underline underline-offset-4' : ''}`}
                  >
                    {universeShortName(lane.timelineID)}
                  </b>
                  <small className="text-[11px] text-muted-foreground">
                    {inherited
                      ? 'inherited'
                      : `${lane.stations.length} event${lane.stations.length === 1 ? '' : 's'}`}
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        <div
          ref={scroller}
          className="min-w-0 overflow-x-auto overflow-y-hidden"
          role="region"
          aria-label="Universe chart"
          // Lets keyboard users scroll the chart.
          tabIndex={0}
        >
          <svg
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="block"
            onClick={(e) => {
              if (e.target === e.currentTarget) onSelectEvent(null);
            }}
          >
            {layout.lanes.map((lane, i) =>
              i % 2 === 1 ? (
                <rect
                  key={`band-${lane.timelineID}`}
                  x={0}
                  y={axisHeight + i * laneHeight}
                  width="100%"
                  height={laneHeight}
                  fill="rgb(125 255 155 / 0.035)"
                />
              ) : null,
            )}
            <line
              x1={0}
              x2={layout.width}
              y1={axisHeight - 0.5}
              y2={axisHeight - 0.5}
              className="stroke-border"
            />
            {layout.columns.map((c) => (
              <g key={c.x} aria-hidden="true">
                <line
                  x1={c.x}
                  x2={c.x}
                  y1={axisHeight - 10}
                  y2={layout.height - 6}
                  className="stroke-border"
                  strokeDasharray="2 5"
                />
                <text
                  x={c.x}
                  y={axisHeight - 20}
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-[11px]"
                >
                  {truncate(c.label, 16)}
                </text>
              </g>
            ))}

            {layout.lanes.map((lane) => {
              const dim = highlight
                ? !lane.stations.some((s) => highlight.has(s.event.id))
                : false;
              return (
                <path
                  key={`line-${lane.timelineID}`}
                  d={lane.path}
                  fill="none"
                  stroke={lane.color}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={dim ? 0.2 : 1}
                  style={{ filter: `drop-shadow(0 0 4px ${lane.color})` }}
                  pointerEvents="none"
                  className="transition-opacity motion-reduce:transition-none"
                />
              );
            })}

            {layout.lanes.map((lane) =>
              lane.stations.map(({ event, x, y, isFork }) => {
                const selected = event.id === selectedEventId;
                const dim = highlight ? !highlight.has(event.id) : false;
                const select = () => onSelectEvent(selected ? null : event.id);
                return (
                  <g
                    key={event.id}
                    data-event={event.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`${event.name}, ${event.date || 'undated'}, ${universeName(event.timelineID)}`}
                    className="group cursor-pointer outline-none transition-opacity motion-reduce:transition-none"
                    opacity={dim ? 0.2 : 1}
                    onClick={select}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        select();
                      }
                    }}
                  >
                    <circle cx={x} cy={y} r={22} fill="transparent" />
                    <circle
                      cx={x}
                      cy={y}
                      r={isFork ? 16 : 14}
                      fill="none"
                      strokeWidth={2}
                      className={
                        selected
                          ? 'stroke-primary'
                          : 'stroke-transparent group-focus-visible:stroke-primary'
                      }
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={isFork ? 11 : 8}
                      strokeWidth={4}
                      stroke={lane.color}
                      fill={selected ? lane.color : 'var(--crt-bg)'}
                    />
                    {isFork && (
                      <circle cx={x} cy={y} r={3.5} className="fill-primary" />
                    )}
                    <text
                      x={x}
                      textAnchor="middle"
                      className={`font-display text-[18px] uppercase tracking-wide ${selected ? 'fill-foreground' : 'fill-foreground/90'}`}
                      style={
                        selected
                          ? { filter: `drop-shadow(0 0 3px ${lane.color})` }
                          : undefined
                      }
                    >
                      {/* Two lines at most, stacked upwards from the station. */}
                      {(() => {
                        const lines = wrapLabel(event.name, LABEL_CHARS);
                        return lines.map((line, i) => (
                          <tspan
                            key={i}
                            x={x}
                            y={y - 20 - (lines.length - 1 - i) * 16}
                          >
                            {line}
                          </tspan>
                        ));
                      })()}
                    </text>
                    <text
                      x={x}
                      y={y + 28}
                      textAnchor="middle"
                      className="fill-muted-foreground font-mono text-[10.5px]"
                    >
                      {event.date || 'Undated'}
                    </text>
                  </g>
                );
              }),
            )}

            {layout.lanes.length === 0 && (
              <text
                x={METRO.padLeft + 8}
                y={axisHeight + laneHeight / 2}
                className="fill-muted-foreground text-sm"
              >
                Nothing has happened in this universe yet.
              </text>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default MetroChart;
