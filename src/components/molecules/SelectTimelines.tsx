import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@components/ui/select';
import { Label } from '@components/ui/label';

import React from 'react';

interface SelectTimelineProps {
  timelines: string[];
  selectedTimeline: string | null;
  onSelect: (value: string) => void;
}

const SelectTimeline: React.FC<SelectTimelineProps> = ({
  timelines,
  selectedTimeline,
  onSelect,
}) => (
  <div className="flex flex-col space-y-2 p-6">
    <Label htmlFor="timeline-select">Select a Universe:</Label>
    <Select
      onValueChange={(value) => onSelect(value)}
      value={selectedTimeline || undefined}
    >
      <SelectTrigger id="timeline-select">
        <SelectValue placeholder="Select Timeline" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Universes</SelectItem>
        {timelines.map((timeline) => (
          <SelectItem key={timeline} value={timeline}>
            {timeline}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default SelectTimeline;
