/** @jest-environment node */
import { isAiConfigured } from '@utils/aiConfig';
import { GET } from 'src/app/api/ai-status/route';
import { POST } from 'src/app/api/generate/route';
import { NextRequest } from 'next/server';

// The AI SDK ships as ES modules only; these tests never reach it.
jest.mock('@utils/moderation', () => ({ isFlagged: jest.fn() }));
jest.mock('@utils/intentDetection', () => ({
  isAlternateHistoryRequest: jest.fn(),
}));
jest.mock('@utils/alternateHistoryGenerator', () => ({
  generateAlternateHistory: jest.fn(),
}));

describe('AI configuration', () => {
  const original = process.env.OPENAI_API_KEY;
  afterEach(() => {
    process.env.OPENAI_API_KEY = original;
  });

  it('is off without a key', async () => {
    delete process.env.OPENAI_API_KEY;
    expect(isAiConfigured()).toBe(false);
    expect(await (await GET()).json()).toEqual({ available: false });
  });

  it('ignores a blank key', () => {
    process.env.OPENAI_API_KEY = '   ';
    expect(isAiConfigured()).toBe(false);
  });

  it('is on with a key', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(await (await GET()).json()).toEqual({ available: true });
  });

  it('refuses to generate without a key', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await POST(
      new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: '{}',
      }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('ai_not_configured');
  });
});
