import React from 'react';
import Button from '../atoms/Button';
import { EventNode } from '../../data/events';

interface EventItemProps {
  event: EventNode;
  onCreateScenario: (event: EventNode) => void;
}

const EventItem: React.FC<EventItemProps> = ({ event, onCreateScenario }) => (
  <li className="event-item">
    <h3>
      {event.date}: {event.name}
    </h3>
    <p>{event.description}</p>
    <Button onClick={() => onCreateScenario(event)}>
      Create Divergent Scenario
    </Button>
    {event.children && (
      <ul>
        {event.children.map((childEvent) => (
          <EventItem
            key={childEvent.id}
            event={childEvent}
            onCreateScenario={onCreateScenario}
          />
        ))}
      </ul>
    )}
  </li>
);

export default EventItem;
