import React from 'react';
import { EventNode } from 'src/data/events';

interface SelectEventProps {
  events: EventNode[];
  selectedEventId: string | null;
  onSelect: (eventId: string) => void;
}

const SelectEvent: React.FC<SelectEventProps> = ({
  events,
  selectedEventId,
  onSelect,
}) => (
  <div>
    <label>Select an Event:</label>
    <select
      value={selectedEventId || ''}
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="">Select Event</option>
      {events.map((event) => (
        <option key={event.id} value={event.id}>
          {event.name}
        </option>
      ))}
    </select>
  </div>
);

export default SelectEvent;
