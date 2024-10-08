import React, { useState } from 'react';
import EventItem from '../molecules/EventItem';
import Modal from '../atoms/Modal';
import UserInputForm from './UserInputForm';
import events from 'src/data/events';

interface Event {
  date: string;
  title: string;
  description: string;
}

const Timeline: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleCreateScenario = (event: Event) => {
    setSelectedEvent(event);
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  return (
    <div className="timeline">
      <h2>Historical Timeline</h2>
      <ul>
        {events.map((event, index) => (
          <EventItem
            key={index}
            event={event}
            onCreateScenario={handleCreateScenario}
          />
        ))}
      </ul>
      <Modal isOpen={!!selectedEvent} onClose={closeModal}>
        {selectedEvent && (
          <UserInputForm event={selectedEvent} closeModal={closeModal} />
        )}
      </Modal>
    </div>
  );
};

export default Timeline;
