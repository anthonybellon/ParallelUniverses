'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  Handle,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { EventNode } from 'src/data/events';
import { TimelineMeta } from '@utils/timelineGraph';
import {
  buildSwimlaneLayout,
  EventFlowNode,
  FlowNode,
  LaneFlowNode,
  TickFlowNode,
} from '@utils/swimlaneLayout';
import { universeName } from '@utils/universeNames';
import { LABEL_CHARS, wrapLabel } from '@utils/wrapLabel';

interface UniverseChartProps {
  /** One list of events per lane, top to bottom. */
  lanes: EventNode[][];
  meta?: Record<string, TimelineMeta>;
  focusTimeline?: string | null;
  highlightIds?: string[] | null;
  selectedEventId?: string | null;
  onSelectEvent: (eventId: string | null) => void;
}

const SelectContext = createContext<(eventId: string | null) => void>(() => {});

const EventNodeView: React.FC<NodeProps<EventFlowNode>> = ({ data }) => {
  const onSelect = useContext(SelectContext);
  const { event, color, dimmed, selected, inherited } = data;
  const size = selected ? 22 : event.eventType === 'Splinter' ? 18 : 14;

  // The node itself is just the dot, so edges meet at its centre; the
  // label hangs below it.
  return (
    <div className="relative h-6 w-6" style={{ opacity: dimmed ? 0.3 : 1 }}>
      <Handle
        type="target"
        id="prev"
        position={Position.Left}
        className="!opacity-0"
      />
      <Handle
        type="source"
        id="next"
        position={Position.Right}
        className="!opacity-0"
      />
      <Handle
        type="source"
        id="fork"
        position={Position.Bottom}
        className="!opacity-0"
      />
      <Handle
        type="target"
        id="branch"
        position={Position.Top}
        className="!opacity-0"
      />
      {/*
        Same layout as the scroll view: the title above the dot and the date
        below. The title box has a fixed height so the dot always sits on the
        node's centre, where the edges meet.
      */}
      <button
        type="button"
        className="nodrag nopan absolute -top-9 left-1/2 flex w-[128px] -translate-x-1/2 flex-col items-center pb-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={`${event.name}, ${event.date || 'undated'}, ${universeName(event.timelineID)}${inherited ? ' (inherited)' : ''}`}
        aria-pressed={selected}
        onClick={() => onSelect(selected ? null : event.id)}
      >
        <span
          aria-hidden="true"
          className="flex h-9 flex-col items-center justify-end pb-1 font-display text-[18px] uppercase leading-4 tracking-wide text-foreground"
          style={
            selected
              ? { textShadow: `0 0 4px ${color}, 0 0 10px ${color}` }
              : undefined
          }
        >
          {wrapLabel(event.name, LABEL_CHARS).map((line, i) => (
            <span key={i} className="block whitespace-nowrap">
              {line}
            </span>
          ))}
        </span>
        <span
          className="flex h-6 items-center justify-center"
          aria-hidden="true"
        >
          <span
            className="block rounded-full border-[3px]"
            style={{
              width: size,
              height: size,
              borderColor: color,
              backgroundColor: selected ? color : 'var(--crt-bg)',
              boxShadow: `0 0 ${selected ? 14 : 6}px ${color}`,
            }}
          />
        </span>
        <span
          aria-hidden="true"
          className="mt-1 font-mono text-[10.5px] leading-none text-muted-foreground"
        >
          {event.date}
        </span>
      </button>
    </div>
  );
};

const LaneNodeView: React.FC<NodeProps<LaneFlowNode>> = ({ data }) => (
  <div
    className="flex h-full items-center border-y border-border"
    style={{ width: data.width, backgroundColor: `${data.color}0f` }}
  >
    <span
      className="ml-3 flex items-center gap-2 font-display text-xl uppercase tracking-wider"
      style={{ opacity: data.inherited ? 0.6 : 1, color: data.color }}
    >
      <span
        className="inline-block h-3 w-3"
        style={{ backgroundColor: data.color }}
      />
      {universeName(data.timelineID)}
      {data.inherited && (
        <span className="text-muted-foreground">(inherited)</span>
      )}
    </span>
  </div>
);

const TickNodeView: React.FC<NodeProps<TickFlowNode>> = ({ data }) => (
  <div className="pointer-events-none flex flex-col items-center">
    <span className="font-display text-lg text-muted-foreground">
      {data.year}
    </span>
    <span
      className="w-px border-l border-dashed border-border"
      style={{ height: data.height }}
    />
  </div>
);

const nodeTypes = {
  event: EventNodeView,
  lane: LaneNodeView,
  tick: TickNodeView,
};

/** How many of the latest events the view opens on. */
const FOCUS_EVENTS = 8;

/**
 * The events the view opens on. A whole century doesn't fit at a readable
 * size, so it opens on the latest events of the universe being viewed (and
 * where it splits off), or on the latest event of every universe when
 * viewing them all. The rest is a scroll away.
 */
const focusNodes = (nodes: FlowNode[], focusTimeline?: string | null) => {
  const events = nodes
    .filter((n): n is EventFlowNode => n.type === 'event')
    .sort((a, b) => a.position.x - b.position.x);
  if (!focusTimeline || focusTimeline === 'all') {
    const latestPerLane = new Map<string, string>();
    events.forEach((n) => latestPerLane.set(n.data.event.timelineID, n.id));
    const ids = new Set([
      ...latestPerLane.values(),
      ...events.slice(-3).map((n) => n.id),
    ]);
    return Array.from(ids, (id) => ({ id }));
  }
  const own = events.filter((n) => n.data.event.timelineID === focusTimeline);
  const forkId = own.find((n) => n.data.event.parentID)?.data.event.parentID;
  const ids = own.slice(-FOCUS_EVENTS).map((n) => n.id);
  if (
    forkId &&
    events.some((n) => n.id === forkId) &&
    ids.length < FOCUS_EVENTS
  ) {
    ids.unshift(forkId);
  }
  return ids.map((id) => ({ id }));
};

const fitOptions = (nodes: { id: string }[]) => ({
  nodes,
  padding: 0.25,
  maxZoom: 1,
  minZoom: 0.4,
});

/** Moves the view whenever a different set of lanes is shown. */
const FitOnChange: React.FC<{
  signature: string;
  nodes: { id: string }[];
}> = ({ signature, nodes }) => {
  const { fitView } = useReactFlow();
  useEffect(() => {
    // Wait a frame so React Flow has measured the new nodes.
    const frame = requestAnimationFrame(() => {
      void fitView({ ...fitOptions(nodes), duration: 300 });
    });
    return () => cancelAnimationFrame(frame);
    // Only when the lanes change, not on every selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, fitView]);
  return null;
};

/**
 * Universes as swimlanes on a time axis. Click (or press Enter on) an event
 * to select it.
 */
const UniverseChart: React.FC<UniverseChartProps> = ({
  lanes,
  meta,
  focusTimeline,
  highlightIds,
  selectedEventId,
  onSelectEvent,
}) => {
  const { nodes, edges } = useMemo(
    () =>
      buildSwimlaneLayout({
        lanes,
        meta,
        focusTimeline,
        highlightIds,
        selectedEventId,
      }),
    [lanes, meta, focusTimeline, highlightIds, selectedEventId],
  );

  const focus = useMemo(
    () => focusNodes(nodes, focusTimeline),
    [nodes, focusTimeline],
  );

  const signature = lanes
    .map((l) => `${l[0]?.timelineID}:${l.length}`)
    .join('|');

  return (
    <SelectContext.Provider value={onSelectEvent}>
      <ReactFlowProvider>
        <div
          className="h-full w-full"
          role="region"
          aria-label="Universe chart"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            edgesFocusable={false}
            fitView
            fitViewOptions={fitOptions(focus)}
            minZoom={0.05}
            maxZoom={2}
            // Scrolling moves along the timeline; pinch or ctrl+scroll zooms.
            panOnScroll
            zoomOnScroll={false}
            onPaneClick={() => onSelectEvent(null)}
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
          >
            <Background gap={24} color="var(--phosphor-faint)" />
            <Controls showInteractive={false} />
            <FitOnChange signature={signature} nodes={focus} />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </SelectContext.Provider>
  );
};

export default UniverseChart;
