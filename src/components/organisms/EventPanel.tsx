'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Button, buttonVariants } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import ConfirmButton from '@components/atoms/ConfirmButton';
import TerminalPanel from '@components/atoms/TerminalPanel';
import EventComposer from '@components/organisms/EventComposer';
import { builtInEventIDs, protectedIDs } from 'src/data/builtIn';
import { EventDraft, EventNode, EventType } from 'src/data/events';
import { useUniverseStore } from '@store/universeStore';
import {
  getEventDeleteBlocker,
  getSplinters,
  PRIME_TIMELINE_ID,
  validateNewEvent,
} from '@utils/timelineGraph';
import {
  logicCheckForDraft,
  logicCheckForEvent,
  requestGeneratedEvent,
  requestLogicCheck,
} from '@utils/generateClient';
import LogicCheck from '@components/molecules/LogicCheck';
import { logHref } from '@utils/routes';
import { TEXT_LIMITS } from '@utils/sanitizeInput';
import { useUndoableToast } from '@hooks/useUndoableToast';
import { universeName, universeShortName } from '@utils/universeNames';

interface EventPanelProps {
  event: EventNode;
  /** The universe being viewed, or 'all'. */
  viewingTimeline: string | null;
}

type Action = EventType | 'edit' | null;

const EventEditor: React.FC<{
  event: EventNode;
  onDone: () => void;
}> = ({ event, onDone }) => {
  const editEvent = useUniverseStore((s) => s.editEvent);
  const pushToast = useUniverseStore((s) => s.pushToast);
  const [draft, setDraft] = useState<EventDraft>({
    name: event.name,
    date: event.date,
    description: event.description,
  });
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = editEvent(event.id, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    pushToast({ message: `Saved "${result.event.name}".`, tone: 'success' });
    onDone();
  };

  return (
    <TerminalPanel
      level={3}
      title="Edit event"
      onSubmit={submit}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label htmlFor="editName">Title</Label>
        <Input
          id="editName"
          value={draft.name}
          maxLength={TEXT_LIMITS.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="editDate">Date</Label>
        <Input
          id="editDate"
          value={draft.date}
          maxLength={TEXT_LIMITS.date}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="editDescription">Description</Label>
        <Textarea
          id="editDescription"
          value={draft.description}
          maxLength={TEXT_LIMITS.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={6}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-alert">
          ! {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Save changes</Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </TerminalPanel>
  );
};

/** The selected event: what happened, and what you can do from here. */
const EventPanel: React.FC<EventPanelProps> = ({ event, viewingTimeline }) => {
  const locale = useLocale();
  const events = useUniverseStore((s) => s.events);
  const aiAvailable = useUniverseStore((s) => s.aiAvailable);
  const addEvent = useUniverseStore((s) => s.addEvent);
  const deleteEvent = useUniverseStore((s) => s.deleteEvent);
  const setSelectedTimeline = useUniverseStore((s) => s.setSelectedTimeline);
  const setSelectedEventId = useUniverseStore((s) => s.setSelectedEventId);
  const setAiAvailable = useUniverseStore((s) => s.setAiAvailable);
  const pushToast = useUniverseStore((s) => s.pushToast);
  const toastWithUndo = useUndoableToast();
  const [action, setAction] = useState<Action>(null);

  const builtIn =
    event.timelineID === PRIME_TIMELINE_ID || builtInEventIDs.has(event.id);
  const blocker = getEventDeleteBlocker(events, event.id, protectedIDs);
  const splinters = getSplinters(events, event.id);
  const canContinue = event.timelineID !== PRIME_TIMELINE_ID;
  const inherited =
    !!viewingTimeline &&
    viewingTimeline !== 'all' &&
    viewingTimeline !== event.timelineID;
  // Open the book of the universe being viewed when the event is part of it.
  const bookUniverse = inherited ? viewingTimeline! : event.timelineID;

  const remove = () => {
    const result = deleteEvent(event.id);
    if (result.ok) toastWithUndo(`Deleted "${event.name}".`);
    else pushToast({ message: result.error, tone: 'error' });
  };

  const save =
    (eventType: EventType) =>
    (draft: EventDraft, newUniverse?: string): string | null => {
      const result = addEvent({
        sourceEvent: event,
        eventType,
        draft,
        newTimelineName: newUniverse,
      });
      if (!result.ok) return result.error;
      const added = result.event;
      setAction(null);
      // Show the universe the event went into, with the new event selected.
      if (eventType === 'Splinter' || viewingTimeline !== 'all') {
        setSelectedTimeline(added.timelineID);
      }
      setSelectedEventId(added.id);
      pushToast({
        message:
          eventType === 'Splinter'
            ? `Universe "${added.timelineID}" begins with "${added.name}".`
            : `Added "${added.name}" to ${universeName(added.timelineID)}.`,
        tone: 'success',
      });
      return null;
    };

  const generate =
    (eventType: EventType) =>
    async (question: string, newUniverse?: string) => {
      const outcome = await requestGeneratedEvent(
        useUniverseStore.getState().events,
        {
          sourceEvent: event,
          eventType,
          question,
          newTimelineName: newUniverse,
        },
      );
      if (!outcome.ok && outcome.code === 'ai_not_configured') {
        setAiAvailable(false);
      }
      return outcome;
    };

  return (
    <TerminalPanel title="Selected record" className="space-y-4">
      <div className="space-y-2">
        <h3 className="glow font-display text-2xl uppercase leading-tight tracking-wide text-primary">
          {event.name}
        </h3>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-xs">
          <dt className="text-muted-foreground">DATE</dt>
          <dd>{event.date || 'Undated'}</dd>
          <dt className="text-muted-foreground">UNIVERSE</dt>
          <dd>
            {universeShortName(event.timelineID)}
            {inherited && (
              <> (inherited by {universeShortName(viewingTimeline!)})</>
            )}
          </dd>
          {splinters.length > 0 && (
            <>
              <dt className="text-muted-foreground">BRANCHES</dt>
              <dd>Universes that branch here: {splinters.join(', ')}</dd>
            </>
          )}
        </dl>
        {event.description && (
          <p className="max-h-60 overflow-y-auto whitespace-pre-line border-l-2 border-border pl-3 text-sm leading-relaxed">
            {event.description}
          </p>
        )}
      </div>

      {aiAvailable && event.timelineID !== PRIME_TIMELINE_ID && (
        <LogicCheck
          key={`${event.id}:${event.date}:${event.name}`}
          run={() =>
            requestLogicCheck(
              logicCheckForEvent(useUniverseStore.getState().events, event),
            )
          }
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={logHref(locale, bookUniverse, event.id)}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Open log
        </Link>
        {!builtIn && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAction('edit')}
              aria-expanded={action === 'edit'}
            >
              Edit
            </Button>
            <ConfirmButton
              label="Delete event"
              confirmLabel="Confirm delete"
              onConfirm={remove}
              disabled={!!blocker}
              title={blocker ?? undefined}
            />
          </>
        )}
      </div>
      {!builtIn && blocker && (
        <p className="text-xs text-muted-foreground">
          <span aria-hidden="true">{'// '}</span>
          {blocker}
        </p>
      )}

      {action === 'edit' ? (
        <EventEditor event={event} onDone={() => setAction(null)} />
      ) : action ? (
        <EventComposer
          key={`${event.id}-${action}`}
          event={event}
          eventType={action}
          existingUniverses={Object.keys(events)}
          aiAvailable={aiAvailable}
          validate={(input) => validateNewEvent(events, input)}
          generate={generate(action)}
          save={save(action)}
          onCancel={() => setAction(null)}
          checkLogic={(draft, newUniverse) =>
            requestLogicCheck(
              logicCheckForDraft(
                useUniverseStore.getState().events,
                event,
                action,
                draft,
                newUniverse,
              ),
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={() => setAction('Splinter')}>
            Branch into a new universe
          </Button>
          {canContinue && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAction('Continuation')}
            >
              Continue this universe
            </Button>
          )}
        </div>
      )}
    </TerminalPanel>
  );
};

export default EventPanel;
