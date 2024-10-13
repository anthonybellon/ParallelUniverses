'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@components/templates/MainLayout';
import { EventNode } from 'src/data/events';
import primeTimelineJson from 'src/data/timelines.json'; // Prime timeline import

type EventData = Record<string, EventNode[]>;

// Define acceptable event types
type EventType = 'Continuation' | 'Splinter' | 'Embellish';

// Extend EventNode with specific event types
interface ValidEventNode extends EventNode {
  eventType: EventType;
}

// Function to parse and validate the event type
const parseEventType = (type: string): EventType => {
  if (type === 'Continuation' || type === 'Splinter' || type === 'Embellish') {
    return type;
  }
  throw new Error(`Invalid eventType: ${type}`);
};

// Function to transform imported data into typed data
const parsePrimeTimelineData = (data: EventData): EventData => {
  const parsedData: EventData = {};
  for (const [timelineID, events] of Object.entries(data)) {
    parsedData[timelineID] = events.map((event) => ({
      ...event,
      eventType: parseEventType(event.eventType),
    })) as ValidEventNode[];
  }
  return parsedData;
};

// Function to get unique timeline IDs
const getUniqueTimelineIDs = (events: EventData): string[] => {
  return Object.keys(events);
};

// Function to insert event in chronological order
const insertEventInOrder = (
  events: EventNode[],
  newEvent: EventNode,
): EventNode[] => {
  return [...events, newEvent].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
};

const HomePage: React.FC = () => {
  const [timelines, setTimelines] = useState<string[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<EventNode[][]>([]);
  const [allEvents, setAllEvents] = useState<EventData>({});
  const [selectedEvent, setSelectedEvent] = useState<EventNode | null>(null);

  const fetchEvents = () => {
    // Parse and validate prime timeline data
    const primeTimelineData = parsePrimeTimelineData(
      primeTimelineJson as EventData,
    );
    const storedEvents = localStorage.getItem('events');
    const userEvents: EventData = storedEvents ? JSON.parse(storedEvents) : {};

    // Merge user events with prime timeline data
    const combinedEvents: EventData = { ...primeTimelineData, ...userEvents };

    // Ensure events in each timeline are sorted
    Object.keys(combinedEvents).forEach((timelineID) => {
      combinedEvents[timelineID] = combinedEvents[timelineID].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    });

    setAllEvents(combinedEvents);
    setTimelines(getUniqueTimelineIDs(combinedEvents));
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
      const moderationRes = await fetch('/api/moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: question }),
      });

      if (!moderationRes.ok) throw new Error('Error during moderation check.');

      const { isFlagged } = await moderationRes.json();
      if (isFlagged) {
        alert('Content is flagged. Please try rephrasing your message.');
        return;
      }

      const intentRes = await fetch('/api/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: question }),
      });

      if (!intentRes.ok) throw new Error('Error during intent detection.');

      const { intent } = await intentRes.json();
      if (intent !== 'createAlternateTimelineEvent') {
        alert(
          'The content does not align with creating an alternate timeline event.',
        );
        return;
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, question, newTimelineName }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
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
          ...(event.eventType === 'Splinter' && { parentID: data.parentID }),
          embellishments: [],
        };

        const updatedEvents = { ...allEvents };
        if (isSplinter && newTimelineName) {
          updatedEvents[newTimelineName] = [newEvent];
          setTimelines((prevTimelines) => [...prevTimelines, newTimelineName]);
        } else {
          const timelineId = event.timelineID;
          if (timelineId) {
            updatedEvents[timelineId] = insertEventInOrder(
              updatedEvents[timelineId] || [],
              newEvent,
            );
          }
        }

        setAllEvents(updatedEvents);
        localStorage.setItem('events', JSON.stringify(updatedEvents));
        fetchEvents();
      } else {
        console.error('Error: Event was not properly stored.');
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
