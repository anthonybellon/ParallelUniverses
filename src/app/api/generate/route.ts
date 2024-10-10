import { NextRequest, NextResponse } from 'next/server';
import { generateAlternateHistory } from '@utils/alternateHistoryGenerator';
import { sanitizeInput } from '@utils/sanitizeInput';
import fs from 'fs';
import path from 'path';
import type { EventNode } from 'src/data/events';

const eventsFilePath = path.join(
  process.cwd(),
  'src',
  'data',
  'timelines.json',
);

const readTimelinesFile = (): Record<string, EventNode[]> => {
  const fileContents = fs.readFileSync(eventsFilePath, 'utf-8');
  return JSON.parse(fileContents);
};

const writeTimelinesFile = (data: Record<string, EventNode[]>) => {
  fs.writeFileSync(eventsFilePath, JSON.stringify(data, null, 2), 'utf-8');
};

const insertEventInOrder = (
  events: EventNode[],
  newEvent: EventNode,
): EventNode[] => {
  return [...events, newEvent].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
};

export async function POST(req: NextRequest) {
  try {
    const { event, question, newTimelineName } = await req.json();
    const timelines = readTimelinesFile();
    const sanitizedDate = sanitizeInput(event.date, 'date');
    const sanitizedTitle = sanitizeInput(event.name);
    const sanitizedDescription = sanitizeInput(event.description);
    const sanitizedQuestion = sanitizeInput(question);

    const alternateHistory = await generateAlternateHistory(
      sanitizedDate,
      sanitizedTitle,
      sanitizedDescription,
      sanitizedQuestion,
    );

    if (typeof alternateHistory !== 'string') {
      const newEvent: EventNode = {
        id: String(Date.now()),
        timelineID: newTimelineName || event.timelineID,
        name: alternateHistory.title,
        date: alternateHistory.date,
        description: alternateHistory.description,
        eventType: event.eventType,
        embellishments: [],
      };

      const timelineID = newEvent.timelineID;
      if (timelines[timelineID]) {
        timelines[timelineID] = insertEventInOrder(
          timelines[timelineID],
          newEvent,
        );
      } else {
        timelines[timelineID] = [newEvent];
      }

      writeTimelinesFile(timelines);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'An unknown error occurred' },
      { status: 500 },
    );
  }
}
