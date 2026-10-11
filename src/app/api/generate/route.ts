import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAlternateHistory } from '@utils/alternateHistoryGenerator';
import { isAlternateHistoryRequest } from '@utils/intentDetection';
import { isFlagged } from '@utils/moderation';
import { sanitizeInput, TEXT_LIMITS } from '@utils/sanitizeInput';
import {
  aiNotConfiguredResponse,
  invalidKeyResponse,
  isAuthError,
  resolveApiKey,
} from '@utils/aiConfig';

/** Most history entries the prompt takes. */
const MAX_HISTORY = 10;

const text = (max: number) =>
  z
    .unknown()
    .transform((value) => sanitizeInput(value, max))
    .pipe(z.string());

const eventSchema = z.object({
  name: text(TEXT_LIMITS.name),
  date: text(TEXT_LIMITS.date),
  description: text(TEXT_LIMITS.description),
  timelineID: text(TEXT_LIMITS.timelineName),
});

const requestSchema = z.object({
  event: eventSchema,
  eventType: z.enum(['Splinter', 'Continuation']),
  question: text(TEXT_LIMITS.question).pipe(
    z.string().min(1, 'Ask a "what if" question.'),
  ),
  newTimelineName: text(TEXT_LIMITS.timelineName).optional(),
  history: z
    .array(eventSchema)
    .default([])
    .transform((h) => h.slice(-MAX_HISTORY)),
});

const fail = (status: number, code: string, error: string) =>
  NextResponse.json({ error, code }, { status });

/**
 * Generates the next event in a universe. Every request is moderated and
 * checked for intent here, on the server, before anything is generated.
 */
export async function POST(req: NextRequest) {
  const apiKey = resolveApiKey(req);
  if (!apiKey) return aiNotConfiguredResponse();

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail(
      400,
      'invalid_request',
      parsed.error.issues[0]?.message ?? 'Invalid request.',
    );
  }
  const input = parsed.data;

  try {
    const userText = [input.question, input.newTimelineName]
      .filter(Boolean)
      .join('\n');

    if (await isFlagged(userText, apiKey)) {
      return fail(
        422,
        'flagged',
        'That question was flagged by moderation. Try rephrasing it.',
      );
    }
    if (!(await isAlternateHistoryRequest(input.question, apiKey))) {
      return fail(
        422,
        'off_topic',
        'Ask a "what if" question about how history could have gone differently.',
      );
    }

    const draft = await generateAlternateHistory(input, apiKey);
    return NextResponse.json({ draft });
  } catch (error) {
    if (isAuthError(error)) return invalidKeyResponse();
    // The error never includes the key, but keep logs to the message.
    console.error('Error generating an event:', (error as Error)?.message);
    return fail(
      502,
      'generation_failed',
      'The AI could not write this event. Try again in a moment.',
    );
  }
}
