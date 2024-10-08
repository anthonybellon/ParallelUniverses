import React from 'react';
import Button from '../atoms/Button';

interface Event {
  date: string;
  title: string;
  description: string;
}

interface EventItemProps {
  event: Event;
  onCreateScenario: (event: Event) => void;
}

const EventItem: React.FC<EventItemProps> = ({ event, onCreateScenario }) => (
  <li className="event-item">
    <h3>
      {event.date}: {event.title}
    </h3>
    <p>{event.description}</p>
    <Button onClick={() => onCreateScenario(event)}>
      Create Divergent Scenario
    </Button>
  </li>
);

export default EventItem;
