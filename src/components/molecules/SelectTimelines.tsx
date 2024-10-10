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
  <div>
    <label>Select a Timeline:</label>
    <select
      value={selectedTimeline || ''}
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="">Select Timeline</option>
      {timelines.map((timeline) => (
        <option key={timeline} value={timeline}>
          Timeline {timeline}
        </option>
      ))}
    </select>
  </div>
);

export default SelectTimeline;
