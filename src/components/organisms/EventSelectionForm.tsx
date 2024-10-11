'use client';

import React from 'react';
import SelectTimeline from '@components/molecules/SelectTimelines';
import UserInputForm from '@components/organisms/UserInputForm';
import SelectEvent from '@components/molecules/SelectEvent';
import { EventNode } from 'src/data/events';

interface EventSelectionFormProps {
  timelines: string[];
  selectedTimeline: string | null;
  setSelectedTimeline: (timeline: string | null) => void;
  events: EventNode[];
  selectedEvent: EventNode | null;
  setSelectedEvent: (event: EventNode | null) => void;
  addEvent: (
    event: EventNode,
    question: string,
    newTimelineName?: string,
  ) => Promise<void>;
}

const EventSelectionForm: React.FC<EventSelectionFormProps> = ({
  timelines,
  selectedTimeline,
  setSelectedTimeline,
  events,
  selectedEvent,
  setSelectedEvent,
  addEvent,
}) => {
  return (
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <SelectTimeline
        timelines={timelines}
        selectedTimeline={selectedTimeline}
        onSelect={setSelectedTimeline}
      />
      {selectedTimeline && (
        <SelectEvent
          events={events}
          selectedEventId={selectedEvent?.id || null}
          onSelect={(id) =>
            setSelectedEvent(events.find((event) => event.id === id) || null)
          }
        />
      )}
      {selectedEvent && (
        <div className="p-5">
          <UserInputForm
            event={selectedEvent}
            onSubmit={addEvent}
            closeModal={() => setSelectedEvent(null)}
          />
        </div>
      )}
    </div>
  );
};

export default EventSelectionForm;
