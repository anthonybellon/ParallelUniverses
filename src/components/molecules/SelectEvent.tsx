import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@components/ui/select';
import { Label } from '@components/ui/label';

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
  <div className="flex flex-col space-y-2 px-6">
    <Label htmlFor="event-select">Select an Event:</Label>
    <Select
      onValueChange={(value) => onSelect(value === 'reset' ? '' : value)}
      value={selectedEventId || undefined}
    >
      <SelectTrigger id="event-select">
        <SelectValue placeholder="Select Event" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="reset">Select Event</SelectItem>
        {events.map((event) => (
          <SelectItem key={event.id} value={event.id}>
            {event.date} : {event.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default SelectEvent;
