import React, { useState } from 'react';
import FormField from '../molecules/FormField';
import Button from '../atoms/Button';
import { EventNode } from '../../data/events';

interface UserInputFormProps {
  event: EventNode;
  onSubmit: (event: EventNode, question: string) => void;
  closeModal: () => void;
}

const UserInputForm: React.FC<UserInputFormProps> = ({
  event,
  onSubmit,
  closeModal,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('Event Data:', event);
    console.log('Question:', question);
    onSubmit(event, question);
  };
  return (
    <div className="user-input-form">
      <form onSubmit={handleSubmit}>
        <h3>Create a Divergent Scenario for {event.name}</h3>
        <FormField
          label="What if..."
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
          }}
          placeholder="e.g., the event had a different outcome?"
          required
        />
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
