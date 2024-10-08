// src/components/organisms/UserInputForm.tsx

import React, { useState } from 'react';
import FormField from '../molecules/FormField';
import Button from '../atoms/Button';

interface Event {
  date: string;
  title: string;
  description: string;
}

interface UserInputFormProps {
  event: Event;
  closeModal: () => void;
}

const UserInputForm: React.FC<UserInputFormProps> = ({ event, closeModal }) => {
  const [question, setQuestion] = useState('');
  const [alternateHistory, setAlternateHistory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, question }),
      });

      const data = await res.json();
      if (res.ok) {
        setAlternateHistory(data.alternateHistory);
      } else {
        console.error('Error:', data.error);
        setAlternateHistory(
          'An error occurred while generating the alternate history.',
        );
      }
    } catch (error) {
      console.error('Error generating response:', error);
      setAlternateHistory(
        'An error occurred while generating the alternate history.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-input-form">
      {alternateHistory ? (
        <div>
          <h3>Alternate History</h3>
          <p>{alternateHistory}</p>
          <Button onClick={closeModal}>Close</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <h3>
            Create a Divergent Scenario for {event.title} ({event.date})
          </h3>
          <FormField
            label="What if..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
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
      )}
    </div>
  );
};

export default UserInputForm;
