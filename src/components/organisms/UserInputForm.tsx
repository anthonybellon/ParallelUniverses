import React, { useState } from 'react';
import FormField from '../molecules/FormField';
import Button from '../atoms/Button';
import { EventNode } from '../../data/events';

interface UserInputFormProps {
  event: EventNode;
  onSubmit: (
    event: EventNode,
    question: string,
    newTimelineName?: string,
  ) => void;
  closeModal: () => void;
}

const UserInputForm: React.FC<UserInputFormProps> = ({
  event,
  onSubmit,
  closeModal,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState<
    'Splinter' | 'Continuation' | 'Embellish'
  >('Continuation');
  const [newTimelineName, setNewTimelineName] = useState(''); // State for new timeline name

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onSubmit({ ...event, eventType }, question, newTimelineName);
  };

  return (
    <div className="user-input-form">
      <form onSubmit={handleSubmit}>
        <h3>Create a Divergent Scenario for {event.name}</h3>
        <FormField
          label="What if..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., the event had a different outcome?"
          required
        />
        <label>Event Type:</label>
        <select
          value={eventType}
          onChange={(e) =>
            setEventType(
              e.target.value as 'Splinter' | 'Continuation' | 'Embellish',
            )
          }
        >
          <option value="Continuation">Continuation</option>
          <option value="Splinter">Splinter</option>
        </select>

        {eventType === 'Splinter' && (
          <FormField
            label="New Timeline Name:"
            value={newTimelineName}
            onChange={(e) => setNewTimelineName(e.target.value)}
            placeholder="Enter new timeline name"
            required
          />
        )}

        <Button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate'}
        </Button>
        <Button type="button" onClick={closeModal}>
          Cancel
        </Button>
      </form>
    </div>
  );
};

export default UserInputForm;
