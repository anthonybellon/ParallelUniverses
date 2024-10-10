'use client';

import React, { useState, useEffect } from 'react';
import UserInputForm from '@components/organisms/UserInputForm';
import { EventNode } from 'src/data/events';
import MainLayout from '@components/templates/MainLayout';
import SelectTimeline from '@components/molecules/SelectTimelines';
import SelectEvent from '@components/molecules/SelectEvent';
import CollapsibleTreeChart from '@components/organisms/CollapsibleTreeChart';

type EventData = Record<string, EventNode[]>;

const getUniqueTimelineIDs = (events: EventData): string[] => {
  return Object.keys(events);
};

const HomePage: React.FC = () => {
  const [timelines, setTimelines] = useState<string[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<EventNode[]>([]);
  const [allEvents, setAllEvents] = useState<EventData>({});
  const [selectedEvent, setSelectedEvent] = useState<EventNode | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const events: EventData = await response.json();

        setAllEvents(events);
        setTimelines(getUniqueTimelineIDs(events));
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedTimeline && allEvents[selectedTimeline]) {
      const sortedEvents = allEvents[selectedTimeline].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      setTimelineEvents(sortedEvents);
      setSelectedEvent(null);
    }
  }, [selectedTimeline, allEvents]);

  const addEvent = async (
    event: EventNode,
    question: string,
    newTimelineName?: string,
  ) => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, question, newTimelineName }),
      });
      const data = await response.json();

      if (response.ok) {
        const isSplinter = event.eventType === 'Splinter';
        const newEvent: EventNode = {
          id: String(Date.now()),
          timelineID: isSplinter
            ? newTimelineName || String(Date.now())
            : event.timelineID,
          name: data.title,
          date: data.date,
          description: data.description,
          eventType: event.eventType,
          embellishments: [],
        };

        const updatedEvents = { ...allEvents };
        if (isSplinter && newTimelineName) {
          updatedEvents[newTimelineName] = [newEvent];
          setTimelines((prevTimelines) => [...prevTimelines, newTimelineName]);
        } else {
          const timelineId = event.timelineID;
          if (timelineId) {
            updatedEvents[timelineId] = [
              ...(updatedEvents[timelineId] || []),
              newEvent,
            ];
          }
        }

        setAllEvents(updatedEvents);
        if (selectedTimeline) {
          setTimelineEvents(
            (updatedEvents[selectedTimeline] || []).sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            ),
          );
        }
      }
    } catch (error) {
      console.error('Error generating alternate history:', error);
    }
  };

  return (
    <MainLayout>
      <CollapsibleTreeChart data={timelineEvents} />
      <SelectTimeline
        timelines={timelines}
        selectedTimeline={selectedTimeline}
        onSelect={setSelectedTimeline}
      />
      {selectedTimeline && (
        <SelectEvent
          events={timelineEvents}
          selectedEventId={selectedEvent?.id || null}
          onSelect={(id) =>
            setSelectedEvent(
              timelineEvents.find((event) => event.id === id) || null,
            )
          }
        />
      )}
      {selectedEvent && (
        <UserInputForm
          event={selectedEvent}
          onSubmit={addEvent}
          closeModal={() => setSelectedEvent(null)}
        />
      )}
    </MainLayout>
  );
};

export default HomePage;
