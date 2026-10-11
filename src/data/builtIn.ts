import timelinesJson from './timelines.json';
import { parseEventData } from '@utils/storage';
import { EventData, ProtectedIDs } from '@utils/timelineGraph';

/**
 * Universes and events that ship with the app. They are loaded from
 * timelines.json every time and can't be deleted.
 */
export const builtInData: EventData = parseEventData(timelinesJson);

export const builtInTimelineIDs = new Set(Object.keys(builtInData));

export const builtInEventIDs = new Set(
  Object.values(builtInData).flatMap((events) => events.map((e) => e.id)),
);

export const protectedIDs: ProtectedIDs = {
  timelines: builtInTimelineIDs,
  events: builtInEventIDs,
};
