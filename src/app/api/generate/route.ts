import { NextRequest, NextResponse } from 'next/server';
import { generateAlternateHistory } from '@utils/alternateHistoryGenerator';
import { sanitizeInput } from '@utils/sanitizeInput';

export async function POST(req: NextRequest) {
  try {
    const { event, question } = await req.json();
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

    return NextResponse.json(alternateHistory);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'An unknown error occurred' },
      { status: 500 },
    );
  }
}
