'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@components/templates/MainLayout';
import { EventNode } from 'src/data/events';

type EventData = Record<string, EventNode[]>;

const getUniqueTimelineIDs = (events: EventData): string[] => {
  return Object.keys(events);
};

const HomePage: React.FC = () => {
  const [timelines, setTimelines] = useState<string[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<EventNode[][]>([]);
  const [allEvents, setAllEvents] = useState<EventData>({});
  const [selectedEvent, setSelectedEvent] = useState<EventNode | null>(null);

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

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedTimeline === 'all') {
      const allTimelineEvents = Object.values(allEvents);
      setTimelineEvents(allTimelineEvents);
      setSelectedEvent(null);
    } else if (selectedTimeline && allEvents[selectedTimeline]) {
      const sortedEvents = allEvents[selectedTimeline].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      setTimelineEvents([sortedEvents]);
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
        setAllEvents(allEvents);
        await fetchEvents();
      }
    } catch (error) {
      console.error('Error generating alternate history:', error);
    }
  };

  return (
    <MainLayout
      timelineEvents={timelineEvents}
      timelines={timelines}
      selectedTimeline={selectedTimeline}
      setSelectedTimeline={setSelectedTimeline}
      selectedEvent={selectedEvent}
      setSelectedEvent={setSelectedEvent}
      addEvent={addEvent}
    />
  );
};

export default HomePage;
