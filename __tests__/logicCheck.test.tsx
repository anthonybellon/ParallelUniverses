/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LogicCheck from '@components/molecules/LogicCheck';
import { logicCheckForDraft, logicCheckForEvent } from '@utils/generateClient';
import { buildLogicCheckPrompt } from '@utils/promptTemplates';
import { EventNode } from 'src/data/events';
import { EventData } from '@utils/timelineGraph';

const ev = (
  id: string,
  timelineID: string,
  date: string,
  extra: Partial<EventNode> = {},
): EventNode => ({
  id,
  timelineID,
  date,
  name: `Event ${id}`,
  description: `About ${id}.`,
  eventType: 'Continuation',
  ...extra,
});

const data: EventData = {
  '1': [ev('p1', '1', '1960'), ev('p2', '1', '1963')],
  K: [
    ev('k1', 'K', '1963', { eventType: 'Splinter', parentID: 'p2' }),
    ev('k2', 'K', '1964'),
  ],
};

describe('what the logic check is given', () => {
  it('sends a saved event with its fork and what came before', () => {
    const body = logicCheckForEvent(data, data.K[1]);
    expect(body.universe).toBe('K');
    expect(body.event.name).toBe('Event k2');
    expect(body.fork?.name).toBe('Event p2');
    expect(body.history.map((h) => h.name)).toEqual([
      'Event p1',
      'Event p2',
      'Event k1',
    ]);
  });

  it('sends a draft for a new universe with its fork', () => {
    const body = logicCheckForDraft(
      data,
      data['1'][1],
      'Splinter',
      { name: 'Shot misses', date: '1963-11-22', description: '' },
      'Survives',
    );
    expect(body).toMatchObject({
      universe: 'Survives',
      eventType: 'Splinter',
      event: { name: 'Shot misses', timelineID: 'Survives' },
      fork: { name: 'Event p2' },
    });
  });

  it('asks about timing and divergence, naming the prime universe', () => {
    const prompt = buildLogicCheckPrompt(logicCheckForEvent(data, data.K[0]));
    expect(prompt).toContain('Timing');
    expect(prompt).toContain('Divergence');
    expect(prompt).toContain('the prime universe (real recorded history)');
    expect(prompt).toContain('where it diverges');
  });
});

describe('LogicCheck', () => {
  it('runs only when asked and shows the verdict', async () => {
    const user = userEvent.setup();
    const run = jest.fn().mockResolvedValue({
      ok: true,
      result: {
        verdict: 'questionable',
        timing: { ok: false, note: 'Too soon after the shooting.' },
        divergence: { ok: true, note: 'Follows from the miss.' },
        suggestions: ['Move it a year later.'],
      },
    });
    render(<LogicCheck run={run} />);
    expect(run).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Check logic' }));
    const readout = await screen.findByRole('region', { name: 'Logic check' });
    expect(readout).toHaveTextContent('Logic check :: QUESTIONABLE');
    expect(readout).toHaveTextContent(
      '[!!] TIMING Too soon after the shooting.',
    );
    expect(readout).toHaveTextContent('[OK] DIVERGENCE Follows from the miss.');
    expect(readout).toHaveTextContent('Move it a year later.');
  });

  it('shows why it could not check', async () => {
    const user = userEvent.setup();
    render(
      <LogicCheck
        run={jest.fn().mockResolvedValue({ ok: false, error: 'Flagged.' })}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Check logic' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Flagged.');
  });

  it('waits until a draft has what it needs', () => {
    render(
      <LogicCheck run={jest.fn()} blocked="Give the event a title first." />,
    );
    expect(screen.getByRole('button', { name: 'Check logic' })).toBeDisabled();
  });
});
