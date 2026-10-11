/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from 'src/app/api/ai-key/route';
import { isValidKeyFormat, resolveApiKey } from '@utils/aiConfig';

const KEY = 'sk-proj-0123456789abcdefghijklmn';

const check = (key?: string) =>
  POST(
    new NextRequest('http://localhost/api/ai-key', {
      method: 'POST',
      headers: key ? { 'x-openai-key': key } : {},
    }),
  );

describe('checking a key', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('accepts a key OpenAI accepts', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const res = await check(KEY);
    expect(await res.json()).toEqual({ valid: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({ headers: { Authorization: `Bearer ${KEY}` } }),
    );
  });

  it('reports a key OpenAI rejects', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    const res = await check(KEY);
    expect(res.status).toBe(401);
    expect((await res.json()).valid).toBe(false);
  });

  it('never sends something that is not a key', async () => {
    global.fetch = jest.fn();
    const res = await check('password123');
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('which key is used', () => {
  const original = process.env.OPENAI_API_KEY;
  afterEach(() => {
    process.env.OPENAI_API_KEY = original;
  });
  const req = (headers: Record<string, string> = {}) =>
    new Request('http://localhost', { headers });

  it("prefers the user's key, then the server's, then none", () => {
    process.env.OPENAI_API_KEY = 'sk-server';
    expect(resolveApiKey(req({ 'x-openai-key': KEY }))).toBe(KEY);
    expect(resolveApiKey(req({ 'x-openai-key': 'nonsense' }))).toBe(
      'sk-server',
    );
    delete process.env.OPENAI_API_KEY;
    expect(resolveApiKey(req())).toBeNull();
  });

  it('checks the shape of a key', () => {
    expect(isValidKeyFormat(KEY)).toBe(true);
    expect(isValidKeyFormat('sk-short')).toBe(false);
    expect(isValidKeyFormat('sk-has spaces in it 0123456789')).toBe(false);
  });
});
