import React, { useState } from 'react';
import EventItem from '../molecules/EventItem';
import Modal from '../atoms/Modal';
import UserInputForm from './UserInputForm';
import { events as initialEvents, EventNode } from 'src/data/events';

const Timeline: React.FC = () => {
  const [events, setEvents] = useState<EventNode[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<EventNode | null>(null);

  const handleCreateScenario = (event: EventNode) => {
    setSelectedEvent(event);
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  const addEvent = (newEvent: EventNode) => {
    const updateEvents = (eventList: EventNode[]): EventNode[] => {
      return eventList.map((event) => {
        if (event.id === newEvent.parent) {
          return { ...event, children: [...(event.children || []), newEvent] };
        }
        if (event.children) {
          return { ...event, children: updateEvents(event.children) };
        }
        return event;
      });
    };

    setEvents(updateEvents(events));
    closeModal();
  };

  return (
    <div className="timeline">
      <h2>Historical Timeline</h2>
      <ul>
        {events.map((event) => (
          <EventItem
            key={event.id}
            event={event}
            onCreateScenario={handleCreateScenario}
          />
        ))}
      </ul>
      <Modal isOpen={!!selectedEvent} onClose={closeModal}>
        {selectedEvent && (
          <UserInputForm
            event={selectedEvent}
            onSubmit={addEvent}
            closeModal={closeModal}
          />
        )}
      </Modal>
    </div>
  );
};

export default Timeline;
