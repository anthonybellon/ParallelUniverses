import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runLogicCheck } from '@utils/logicCheck';
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
  universe: text(TEXT_LIMITS.timelineName).pipe(z.string().min(1)),
  event: eventSchema.refine((e) => e.name, 'The event needs a title.'),
  eventType: z.enum(['Splinter', 'Continuation']),
  fork: eventSchema.optional(),
  history: z
    .array(eventSchema)
    .default([])
    .transform((h) => h.slice(-MAX_HISTORY)),
});

const fail = (status: number, code: string, error: string) =>
  NextResponse.json({ error, code }, { status });

/**
 * An optional check of whether an event's timing makes sense and whether it
 * follows from where its universe split off. Nothing is saved.
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
    if (
      await isFlagged(`${input.event.name}\n${input.event.description}`, apiKey)
    ) {
      return fail(
        422,
        'flagged',
        'This event was flagged by moderation, so it was not checked.',
      );
    }
    const result = await runLogicCheck(input, apiKey);
    return NextResponse.json({ result });
  } catch (error) {
    if (isAuthError(error)) return invalidKeyResponse();
    console.error('Error checking an event:', (error as Error)?.message);
    return fail(
      502,
      'check_failed',
      'The AI could not check this event. Try again in a moment.',
    );
  }
}
