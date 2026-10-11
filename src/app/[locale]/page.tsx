'use client';

import React, { useMemo } from 'react';
import MainLayout from '@components/templates/MainLayout';
import UniverseChart from '@components/organisms/UniverseChart';
import MetroChart from '@components/organisms/MetroChart';
import ChartModeSwitch from '@components/molecules/ChartModeSwitch';
import UniversePanel from '@components/organisms/UniversePanel';
import DataMenu from '@components/molecules/DataMenu';
import ApiKeyDialog from '@components/molecules/ApiKeyDialog';
import { EventNode } from 'src/data/events';
import { selectSelectedEvent, useUniverseStore } from '@store/universeStore';
import { useUniverseMeta } from '@hooks/useUniverseMeta';
import {
  getEventLineageIds,
  getLineage,
  orderTimelines,
} from '@utils/timelineGraph';

const HomePage: React.FC = () => {
  const events = useUniverseStore((s) => s.events);
  const selectedTimeline = useUniverseStore((s) => s.selectedTimeline);
  const selectedEvent = useUniverseStore(selectSelectedEvent);
  const setSelectedEventId = useUniverseStore((s) => s.setSelectedEventId);
  const setSelectedTimeline = useUniverseStore((s) => s.setSelectedTimeline);
  const chartMode = useUniverseStore((s) => s.chartMode);
  const setChartMode = useUniverseStore((s) => s.setChartMode);

  // Universes in tree order: each parent followed by those that branch from it.
  const universes = useMemo(() => orderTimelines(events), [events]);
  const meta = useUniverseMeta();

  // One universe shows its full history: its own lane plus the part of each
  // ancestor's lane it inherits.
  const lanes = useMemo<EventNode[][]>(() => {
    if (
      selectedTimeline &&
      selectedTimeline !== 'all' &&
      events[selectedTimeline]
    ) {
      return getLineage(events, selectedTimeline);
    }
    return universes.map((id) => events[id]);
  }, [selectedTimeline, events, universes]);

  const highlightIds = useMemo(
    () =>
      selectedEvent
        ? Array.from(getEventLineageIds(events, selectedEvent.id))
        : null,
    [selectedEvent, events],
  );

  return (
    <MainLayout
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ApiKeyDialog />
          <DataMenu />
        </div>
      }
      hint="Select an event to branch a new universe from it, continue its universe, or open its history as a log."
      chartControls={
        <ChartModeSwitch mode={chartMode} onChange={setChartMode} />
      }
      chart={
        chartMode === 'scroll' ? (
          <MetroChart
            lanes={lanes}
            meta={meta}
            focusTimeline={selectedTimeline}
            highlightIds={highlightIds}
            selectedEventId={selectedEvent?.id ?? null}
            onSelectEvent={setSelectedEventId}
            onSelectUniverse={setSelectedTimeline}
          />
        ) : (
          <UniverseChart
            lanes={lanes}
            meta={meta}
            focusTimeline={selectedTimeline}
            highlightIds={highlightIds}
            selectedEventId={selectedEvent?.id ?? null}
            onSelectEvent={setSelectedEventId}
          />
        )
      }
      sidebar={<UniversePanel universes={universes} meta={meta} />}
    />
  );
};

export default HomePage;
