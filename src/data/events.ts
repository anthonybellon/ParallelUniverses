/**
 * A `Splinter` starts a universe and links it to the event it splits from;
 * a `Continuation` follows on inside its universe.
 */
export type EventType = 'Splinter' | 'Continuation';

export interface EventNode {
  id: string;
  name: string;
  date: string;
  description: string;
  timelineID: string;
  eventType: EventType;
  parentID?: string;
  /** The event retold as a first-person diary entry, for the book. */
  journal?: string;
}

/** The parts of an event a person (or the AI) writes. */
export interface EventDraft {
  name: string;
  date: string;
  description: string;
}
