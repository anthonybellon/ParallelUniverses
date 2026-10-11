import { NextRequest, NextResponse } from 'next/server';
import { API_KEY_HEADER, isValidKeyFormat } from '@utils/aiConfig';

/**
 * Checks a user's own OpenAI key by listing models, which costs nothing.
 * The key is used for this one call and never stored or logged.
 */
export async function POST(req: NextRequest) {
  const key = req.headers.get(API_KEY_HEADER)?.trim();
  if (!isValidKeyFormat(key)) {
    return NextResponse.json(
      {
        valid: false,
        error:
          'That doesn’t look like an OpenAI key. It should start with "sk-".',
      },
      { status: 400 },
    );
  }
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (res.ok) return NextResponse.json({ valid: true });
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { valid: false, error: 'OpenAI rejected this key.' },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { valid: false, error: `OpenAI answered with status ${res.status}.` },
      { status: 502 },
    );
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Could not reach OpenAI to check the key.' },
      { status: 502 },
    );
  }
}
