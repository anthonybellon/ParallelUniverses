'use client';

import React, { useState } from 'react';
import CollapsibleTreeChart from '@components/organisms/CollapsibleTreeChart';
import UserInputForm from '@components/organisms/UserInputForm';
import { events as initialEvents, EventNode } from 'src/data/events';
import MainLayout from '@components/templates/MainLayout';
import Modal from '@components/atoms/Modal';

const HomePage: React.FC = () => {
  const [events, setEvents] = useState<EventNode[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<EventNode | null>(null);

  const handleNodeClick = (event: EventNode) => {
    setSelectedEvent(event);
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  const addEvent = async (event: EventNode, question: string) => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, question }),
      });
      const data = await response.json();

      if (response.ok) {
        const newEvent: EventNode = {
          id: String(Date.now()),
          name: data.title,
          date: data.date,
          description: data.description,
          parent: event.id,
          splinterId: event.id,
          children: [],
        };

        const updateTimeline = (events: EventNode[]): EventNode[] => {
          return events.map((e) => {
            if (e.id === event.id) {
              return { ...e, children: [...(e.children || []), newEvent] };
            }
            if (e.children) {
              return { ...e, children: updateTimeline(e.children) };
            }
            return e;
          });
        };

        setEvents(updateTimeline(events));
      }
    } catch (error) {
      console.error('Error generating alternate history:', error);
    } finally {
      closeModal();
    }
  };

  return (
    <MainLayout>
      <CollapsibleTreeChart data={events} onNodeClick={handleNodeClick} />
      <Modal isOpen={!!selectedEvent} onClose={closeModal}>
        {selectedEvent && (
          <UserInputForm
            event={selectedEvent}
            onSubmit={addEvent}
            closeModal={closeModal}
          />
        )}
      </Modal>
    </MainLayout>
  );
};

export default HomePage;
