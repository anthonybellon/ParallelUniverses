import { NextRequest, NextResponse } from 'next/server';
import { generateAlternateHistory } from '@utils/alternateHistoryGenerator';
import { sanitizeInput } from '@utils/sanitizeInput';

export async function POST(req: NextRequest) {
  try {
    const { event, question, newTimelineName } = await req.json();
    const sanitizedDate = sanitizeInput(event.date, 'date');
    const sanitizedTitle = sanitizeInput(event.name);
    const sanitizedDescription = sanitizeInput(event.description);
    const sanitizedQuestion = sanitizeInput(question);

    // Generate the alternate history
    const alternateHistory = await generateAlternateHistory(
      sanitizedDate,
      sanitizedTitle,
      sanitizedDescription,
      sanitizedQuestion,
    );
    console.log('event id:', event.id);
    // Ensure alternate history generation was successful
    if (typeof alternateHistory !== 'string') {
      return NextResponse.json({
        success: true,
        title: alternateHistory.title,
        timelineID: newTimelineName || event.timelineID,
        date: alternateHistory.date,
        description: alternateHistory.description,
        eventType: event.eventType,
        embellishments: [],
        ...(event.eventType === 'Splinter' && { parentID: event.id }),
      });
    } else {
      throw new Error('Alternate history generation failed.');
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'An unknown error occurred' },
      { status: 500 },
    );
  }
}
