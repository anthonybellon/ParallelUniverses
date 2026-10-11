/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from 'src/app/api/journal/route';
import { isFlagged } from '@utils/moderation';
import { generateJournal } from '@utils/journalGenerator';
import { buildJournalPrompt } from '@utils/promptTemplates';

jest.mock('@utils/moderation', () => ({ isFlagged: jest.fn() }));
jest.mock('@utils/journalGenerator', () => ({ generateJournal: jest.fn() }));

const flagged = isFlagged as jest.Mock;
const generate = generateJournal as jest.Mock;

const wall = {
  name: 'The Wall stands',
  date: '1989-11-10',
  description: 'It holds.',
  timelineID: 'Wall stands',
};

const call = (body: unknown) =>
  POST(
    new NextRequest('http://localhost/api/journal', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

describe('POST /api/journal', () => {
  const original = process.env.OPENAI_API_KEY;
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test';
    flagged.mockReset().mockResolvedValue(false);
    generate
      .mockReset()
      .mockResolvedValue('Dear diary, the wall still stands.');
  });
  afterAll(() => {
    process.env.OPENAI_API_KEY = original;
  });

  it('writes a diary entry', async () => {
    const res = await call({ event: wall, universe: 'Wall stands' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      journal: 'Dear diary, the wall still stands.',
    });
  });

  it('moderates the event before writing', async () => {
    flagged.mockResolvedValue(true);
    const res = await call({ event: wall, universe: 'Wall stands' });
    expect(res.status).toBe(422);
    expect(flagged).toHaveBeenCalledWith(
      'The Wall stands\nIt holds.',
      'sk-test',
    );
    expect(generate).not.toHaveBeenCalled();
  });

  it('refuses without a key', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await call({ event: wall, universe: 'Wall stands' });
    expect(res.status).toBe(503);
  });

  it('rejects an event without a title', async () => {
    const res = await call({ event: { ...wall, name: '' }, universe: 'W' });
    expect(res.status).toBe(400);
  });
});

describe('buildJournalPrompt', () => {
  it('asks for a first-person entry about the event', () => {
    const prompt = buildJournalPrompt({
      event: wall,
      universe: 'Wall stands',
      history: [],
    });
    expect(prompt).toContain('first person');
    expect(prompt).toContain('"""The Wall stands"""');
    expect(prompt).toContain('"""Wall stands"""');
  });
});
