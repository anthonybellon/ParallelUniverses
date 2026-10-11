'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { buttonVariants } from '@components/ui/button';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import ConfirmButton from '@components/atoms/ConfirmButton';
import TerminalPanel from '@components/atoms/TerminalPanel';
import ColorPicker from '@components/molecules/ColorPicker';
import EventPanel from '@components/organisms/EventPanel';
import { builtInTimelineIDs } from 'src/data/builtIn';
import { selectSelectedEvent, useUniverseStore } from '@store/universeStore';
import {
  getDescendantTimelines,
  getForkEvent,
  getTimelineHistory,
  TimelineMeta,
} from '@utils/timelineGraph';
import { logHref } from '@utils/routes';
import { useUndoableToast } from '@hooks/useUndoableToast';
import { universeName, universeShortName } from '@utils/universeNames';

interface UniversePanelProps {
  /** Universes in tree order. */
  universes: string[];
  meta: Record<string, TimelineMeta>;
}

const UniverseSummary: React.FC<{
  timelineID: string;
  meta?: TimelineMeta;
}> = ({ timelineID, meta }) => {
  const locale = useLocale();
  const events = useUniverseStore((s) => s.events);
  const deleteTimeline = useUniverseStore((s) => s.deleteTimeline);
  const customColor = useUniverseStore((s) => s.universeColors[timelineID]);
  const setUniverseColor = useUniverseStore((s) => s.setUniverseColor);
  const pushToast = useUniverseStore((s) => s.pushToast);
  const toastWithUndo = useUndoableToast();

  const fork = getForkEvent(events, timelineID);
  const history = getTimelineHistory(events, timelineID);
  const inherited = history.filter((h) => h.inheritedFrom !== null).length;
  const own = history.length - inherited;
  const descendants = getDescendantTimelines(events, timelineID);
  const builtIn = builtInTimelineIDs.has(timelineID);

  const remove = () => {
    const result = deleteTimeline(timelineID);
    if (!result.ok) {
      pushToast({ message: result.error, tone: 'error' });
      return;
    }
    const count = result.removedTimelines.length;
    toastWithUndo(
      count > 1
        ? `Deleted universe "${timelineID}" and ${count - 1} that branch from it.`
        : `Deleted universe "${timelineID}".`,
    );
  };

  return (
    <TerminalPanel
      title={
        <>
          <span
            aria-hidden="true"
            className="mr-2 inline-block h-3 w-3"
            style={{ backgroundColor: meta?.color }}
          />
          {universeName(timelineID)}
        </>
      }
    >
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">ORIGIN</dt>
        <dd>
          {fork ? (
            <>
              Branches from <b>{universeName(fork.timelineID)}</b> after{' '}
              <b>{fork.name}</b> ({fork.date}).
            </>
          ) : (
            'A root universe. Others branch from it.'
          )}
        </dd>
        <dt className="text-muted-foreground">RECORDS</dt>
        <dd>
          {own} own
          {inherited > 0 && <>, {inherited} inherited</>}
        </dd>
        <dt className="self-center text-muted-foreground">COLOUR</dt>
        <dd>
          <ColorPicker
            label={`Colour of ${universeName(timelineID)}`}
            value={meta?.color ?? ''}
            custom={!!customColor}
            onChange={(color) => setUniverseColor(timelineID, color)}
          />
        </dd>
        <dt className="text-muted-foreground">BRANCHES</dt>
        <dd>
          {descendants.length
            ? `${descendants.length} universe${descendants.length === 1 ? '' : 's'}`
            : 'None yet'}
        </dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={logHref(locale, timelineID)}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Open log
        </Link>
        {!builtIn && (
          <ConfirmButton
            label="Delete universe"
            confirmLabel={
              descendants.length
                ? `Delete ${descendants.length + 1} universes`
                : 'Confirm delete'
            }
            onConfirm={remove}
          />
        )}
      </div>
    </TerminalPanel>
  );
};

/** The sidebar: which universe to view, and the selected event. */
const UniversePanel: React.FC<UniversePanelProps> = ({ universes, meta }) => {
  const selectedTimeline = useUniverseStore((s) => s.selectedTimeline);
  const setSelectedTimeline = useUniverseStore((s) => s.setSelectedTimeline);
  const selectedEvent = useUniverseStore(selectSelectedEvent);
  const viewingOne = !!selectedTimeline && selectedTimeline !== 'all';

  return (
    <div className="space-y-5 text-left">
      <div className="space-y-1">
        <Label htmlFor="universe-select">Universe</Label>
        <Select
          value={selectedTimeline ?? undefined}
          onValueChange={setSelectedTimeline}
        >
          <SelectTrigger id="universe-select">
            <SelectValue placeholder="Choose a universe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All universes</SelectItem>
            {universes.map((id) => (
              <SelectItem key={id} value={id}>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5"
                    style={{
                      backgroundColor: meta[id]?.color,
                      marginLeft: `${(meta[id]?.depth ?? 0) * 0.75}rem`,
                    }}
                  />
                  {universeShortName(id)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {viewingOne && universes.includes(selectedTimeline!) && (
        <UniverseSummary
          timelineID={selectedTimeline!}
          meta={meta[selectedTimeline!]}
        />
      )}

      {selectedEvent ? (
        <EventPanel
          key={selectedEvent.id}
          event={selectedEvent}
          viewingTimeline={selectedTimeline}
        />
      ) : (
        <p className="border border-dashed border-border p-4 text-xs text-muted-foreground">
          <span aria-hidden="true">&gt; </span>
          AWAITING INPUT. Select an event on the chart to read about it, branch
          a new universe from it, or continue its universe.
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-3 w-2 animate-[blink_1.1s_steps(1)_infinite] bg-muted-foreground align-middle motion-reduce:animate-none"
          />
        </p>
      )}
    </div>
  );
};

export default UniversePanel;
