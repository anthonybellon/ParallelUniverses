import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventComposer, {
  EventComposerProps,
} from '@components/organisms/EventComposer';
import { EventNode } from 'src/data/events';
import { validateNewEvent } from '@utils/timelineGraph';

const branchEvent: EventNode = {
  id: 'b1',
  timelineID: 'Wall stands',
  name: 'The Wall stands',
  date: '1989-11-09',
  description: 'It holds.',
  eventType: 'Splinter',
  parentID: 'p2',
};
const data = { 'Wall stands': [branchEvent] };

const setup = (props: Partial<EventComposerProps> = {}) => {
  const save = jest.fn().mockReturnValue(null);
  const generate = jest.fn().mockResolvedValue({
    ok: true,
    draft: { name: 'Talks begin', date: '1990-01-01', description: 'Slowly.' },
  });
  const onCancel = jest.fn();
  render(
    <EventComposer
      event={branchEvent}
      eventType="Splinter"
      existingUniverses={['1', 'Wall stands']}
      aiAvailable={false}
      validate={(input) => validateNewEvent(data, input)}
      generate={generate}
      save={save}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { save, generate, onCancel };
};

describe('EventComposer without an API key', () => {
  it('lets the user write the event and skips the AI', async () => {
    const user = userEvent.setup();
    const { save, generate } = setup();

    expect(screen.getByText(/No OpenAI API key is set up/)).toBeInTheDocument();
    expect(screen.queryByLabelText('What if…')).not.toBeInTheDocument();
    expect(screen.queryByText('Generate with AI')).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Name of the new universe'),
      'Reunified',
    );
    await user.type(
      screen.getByLabelText('What happens'),
      'Reunification talks',
    );
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '1990-10-03');
    await user.type(screen.getByLabelText('Description'), 'Slow and careful.');
    await user.click(screen.getByRole('button', { name: 'Add event' }));

    expect(generate).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(
      {
        name: 'Reunification talks',
        date: '1990-10-03',
        description: 'Slow and careful.',
      },
      'Reunified',
    );
  });

  it('flags a date before the event it follows', async () => {
    const user = userEvent.setup();
    setup();
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '1980');
    expect(screen.getByText(/before "The Wall stands"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add event' })).toBeDisabled();
  });

  it('flags a universe name that is taken', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(
      screen.getByLabelText('Name of the new universe'),
      'Wall stands',
    );
    expect(screen.getByText(/already exists/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add event' })).toBeDisabled();
  });

  it('shows the save error it gets back', async () => {
    const user = userEvent.setup();
    const { save } = setup();
    save.mockReturnValueOnce('Give the event a title.');
    await user.type(screen.getByLabelText('Name of the new universe'), 'X');
    await user.type(screen.getByLabelText('What happens'), 'Something');
    await user.click(screen.getByRole('button', { name: 'Add event' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Give the event a title.',
    );
  });

  it('asks only for the event when continuing a universe', () => {
    setup({ eventType: 'Continuation' });
    expect(
      screen.getByRole('heading', { name: 'Continue universe Wall stands' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Name of the new universe'),
    ).not.toBeInTheDocument();
  });
});

describe('EventComposer with an API key', () => {
  const ask = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText('Name of the new universe'), 'Talks');
    await user.type(screen.getByLabelText('What if…'), 'What if they talked?');
    await user.click(screen.getByRole('button', { name: 'Generate' }));
  };

  it('defaults to the AI and can switch to writing', async () => {
    const user = userEvent.setup();
    setup({ aiAvailable: true });
    expect(
      screen.getByRole('radio', { name: 'Generate with AI' }),
    ).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Write it yourself' }));
    expect(screen.getByLabelText('What happens')).toBeInTheDocument();
  });

  it('previews the AI event before saving it', async () => {
    const user = userEvent.setup();
    const { save, generate } = setup({ aiAvailable: true });
    await ask(user);

    expect(generate).toHaveBeenCalledWith('What if they talked?', 'Talks');
    expect(await screen.findByText('Talks begin')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(save).toHaveBeenCalledWith(
      { name: 'Talks begin', date: '1990-01-01', description: 'Slowly.' },
      'Talks',
    );
  });

  it('locks the form and shows progress while generating', async () => {
    const user = userEvent.setup();
    let finish: (v: unknown) => void = () => {};
    const generate = jest.fn(
      () => new Promise((resolve) => (finish = resolve)),
    );
    setup({ aiAvailable: true, generate: generate as never });
    await ask(user);

    expect(screen.getByRole('status')).toHaveTextContent(/writing the event/);
    expect(screen.getByLabelText('What if…')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled();
    finish({ ok: false, error: 'Flagged.' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Flagged.');
    expect(screen.getByLabelText('What if…')).toBeEnabled();
  });

  it('tries again with the same question', async () => {
    const user = userEvent.setup();
    const { generate } = setup({ aiAvailable: true });
    await ask(user);
    await screen.findByText('Talks begin');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(2));
    expect(generate.mock.calls[1]).toEqual(['What if they talked?', 'Talks']);
  });

  it('opens the preview for editing', async () => {
    const user = userEvent.setup();
    const { save } = setup({ aiAvailable: true });
    await ask(user);
    await screen.findByText('Talks begin');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const title = screen.getByLabelText('What happens');
    expect(title).toHaveValue('Talks begin');
    await user.clear(title);
    await user.type(title, 'Talks fail');
    await user.click(screen.getByRole('button', { name: 'Add event' }));
    expect(save).toHaveBeenCalledWith(
      { name: 'Talks fail', date: '1990-01-01', description: 'Slowly.' },
      'Talks',
    );
  });

  it('will not save a preview dated too early', async () => {
    const user = userEvent.setup();
    setup({
      aiAvailable: true,
      generate: jest.fn().mockResolvedValue({
        ok: true,
        draft: { name: 'Too early', date: '1950', description: '' },
      }),
    });
    await ask(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /before "The Wall stands"/,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
