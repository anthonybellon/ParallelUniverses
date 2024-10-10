/* eslint-disable quotes */
export interface EventNode {
  id: string;
  name: string;
  date: string;
  description: string;
  timelineID: string;
  eventType: 'Splinter' | 'Continuation' | 'Embellish';
  embellishments?: string[];
}
