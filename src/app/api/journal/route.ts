import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateJournal } from '@utils/journalGenerator';
import { isFlagged } from '@utils/moderation';
import { sanitizeInput, TEXT_LIMITS } from '@utils/sanitizeInput';
import {
  aiNotConfiguredResponse,
  invalidKeyResponse,
  isAuthError,
  resolveApiKey,
} from '@utils/aiConfig';

/** Most history entries the prompt takes. */
const MAX_HISTORY = 5;

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
  event: eventSchema.refine((e) => e.name, 'The event needs a title.'),
  universe: text(TEXT_LIMITS.timelineName).pipe(z.string().min(1)),
  history: z
    .array(eventSchema)
    .default([])
    .transform((h) => h.slice(-MAX_HISTORY)),
});

const fail = (status: number, code: string, error: string) =>
  NextResponse.json({ error, code }, { status });

/**
 * Retells an event as a first-person diary entry for the book. The event's
 * text may have been written by the user, so it is moderated first.
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
        'This entry was flagged by moderation, so it was not rewritten.',
      );
    }
    const journal = await generateJournal(input, apiKey);
    return NextResponse.json({ journal });
  } catch (error) {
    if (isAuthError(error)) return invalidKeyResponse();
    console.error('Error writing a diary entry:', (error as Error)?.message);
    return fail(
      502,
      'generation_failed',
      'The AI could not write this entry. Try again in a moment.',
    );
  }
}
