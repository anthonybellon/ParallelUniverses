import { NextResponse } from 'next/server';

/** Header the browser sends a user's own OpenAI key in. */
export const API_KEY_HEADER = 'x-openai-key';

/** True when the server has its own OpenAI API key. */
export const isAiConfigured = (): boolean =>
  Boolean(process.env.OPENAI_API_KEY?.trim());

/** Chat model used for intent checks, events and diary entries. */
export const AI_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

/** Loose check that text looks like an OpenAI key, before it is used. */
export const isValidKeyFormat = (key: string | null | undefined): boolean =>
  !!key && /^sk-[A-Za-z0-9_-]{20,200}$/.test(key.trim());

/**
 * The key to call OpenAI with: the user's own when they sent one, otherwise
 * the server's. Null when there is neither.
 */
export const resolveApiKey = (req: Request): string | null => {
  const own = req.headers.get(API_KEY_HEADER)?.trim();
  if (isValidKeyFormat(own)) return own!;
  return process.env.OPENAI_API_KEY?.trim() || null;
};

/** True when OpenAI turned the key down. */
export const isAuthError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const e = error as { statusCode?: unknown; status?: unknown };
  return e.statusCode === 401 || e.status === 401;
};

export const AI_NOT_CONFIGURED_MESSAGE =
  'No OpenAI API key is set. Add your own key under "API key", or write the event yourself.';

/** A 503 response for AI routes called without any key. */
export const aiNotConfiguredResponse = () =>
  NextResponse.json(
    { error: AI_NOT_CONFIGURED_MESSAGE, code: 'ai_not_configured' },
    { status: 503 },
  );

/** A 401 response for a key OpenAI rejected. */
export const invalidKeyResponse = () =>
  NextResponse.json(
    {
      error: 'OpenAI rejected the API key. Check it under "API key".',
      code: 'invalid_key',
    },
    { status: 401 },
  );
