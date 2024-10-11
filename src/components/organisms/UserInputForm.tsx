'use client';

import { SetStateAction, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { EventNode } from 'src/data/events';

interface UserInputFormProps {
  event: EventNode;
  onSubmit: (
    event: EventNode,
    question: string,
    newTimelineName?: string,
  ) => Promise<void>;
  closeModal: () => void;
}

export default function UserInputForm({
  event,
  onSubmit,
  closeModal,
}: UserInputFormProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState<
    'Splinter' | 'Continuation' | 'Embellish'
  >(event.eventType || 'Continuation');
  const [newTimelineName, setNewTimelineName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onSubmit({ ...event, eventType }, question, newTimelineName);
  };

  return (
    <Card>
      <CardHeader>
        <h5>Create a Divergent Scenario for {event.name}</h5>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="max-h-64 overflow-y-auto">
            <p>{event.description}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type</Label>
            <Select
              value={eventType}
              onValueChange={(
                value: 'Splinter' | 'Continuation' | 'Embellish',
              ) => setEventType(value)}
            >
              <SelectTrigger id="eventType">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Continuation">Continuation</SelectItem>
                <SelectItem value="Splinter">Splinter</SelectItem>
                <SelectItem value="Embellish">Embellish</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="question">What if...</Label>
            <Textarea
              id="question"
              placeholder="e.g., the event had a different outcome?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          {eventType === 'Splinter' && (
            <div className="space-y-2">
              <Label htmlFor="newTimelineName">New Timeline Name</Label>
              <Input
                id="newTimelineName"
                placeholder="Enter new timeline name"
                value={newTimelineName}
                onChange={(e: { target: { value: SetStateAction<string> } }) =>
                  setNewTimelineName(e.target.value)
                }
                required
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
