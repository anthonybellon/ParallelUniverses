/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from 'src/app/api/check/route';
import { isFlagged } from '@utils/moderation';
import { runLogicCheck } from '@utils/logicCheck';

jest.mock('@utils/moderation', () => ({ isFlagged: jest.fn() }));
jest.mock('@utils/logicCheck', () => ({ runLogicCheck: jest.fn() }));

const flagged = isFlagged as jest.Mock;
const check = runLogicCheck as jest.Mock;
const event = {
  name: 'Shot misses',
  date: '1963-11-22',
  description: 'Kennedy lives.',
  timelineID: 'K',
};
const body = { universe: 'K', event, eventType: 'Splinter', history: [] };
const call = (b: unknown) =>
  POST(
    new NextRequest('http://localhost/api/check', {
      method: 'POST',
      body: JSON.stringify(b),
    }),
  );

describe('POST /api/check', () => {
  const original = process.env.OPENAI_API_KEY;
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test';
    flagged.mockReset().mockResolvedValue(false);
    check.mockReset().mockResolvedValue({ verdict: 'plausible' });
  });
  afterAll(() => {
    process.env.OPENAI_API_KEY = original;
  });

  it('moderates, then checks', async () => {
    const res = await call(body);
    expect(await res.json()).toEqual({ result: { verdict: 'plausible' } });
    expect(check).toHaveBeenCalledWith(
      expect.objectContaining({ universe: 'K', eventType: 'Splinter' }),
      'sk-test',
    );
  });

  it('never checks flagged text', async () => {
    flagged.mockResolvedValue(true);
    const res = await call(body);
    expect(res.status).toBe(422);
    expect(check).not.toHaveBeenCalled();
  });

  it('needs a key', async () => {
    delete process.env.OPENAI_API_KEY;
    expect((await call(body)).status).toBe(503);
  });

  it('rejects an event without a title', async () => {
    const res = await call({ ...body, event: { ...event, name: '' } });
    expect(res.status).toBe(400);
  });
});
