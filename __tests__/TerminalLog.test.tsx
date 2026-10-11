import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TerminalLog from '@components/organisms/TerminalLog';
import { JournalControls } from '@components/molecules/LogEntry';
import { EventNode } from 'src/data/events';
import { buildBook } from '@utils/book';
import { EventData } from '@utils/timelineGraph';

// jsdom has no IntersectionObserver. This one lets tests say what is on screen.
let observed: Element[] = [];
let notify: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
beforeAll(() => {
  window.IntersectionObserver = class {
    constructor(cb: (e: Partial<IntersectionObserverEntry>[]) => void) {
      notify = cb;
    }
    observe(el: Element) {
      observed.push(el);
    }
    disconnect() {
      observed = [];
    }
  } as unknown as typeof IntersectionObserver;
  Element.prototype.scrollIntoView = jest.fn();
});

const showOnScreen = (page: number) =>
  act(() =>
    notify(
      observed
        .filter((el) => (el as HTMLElement).dataset.page === String(page))
        .map((target) => ({ target, isIntersecting: true })),
    ),
  );

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
  description: `What happened in ${id}.`,
  eventType: 'Continuation',
  ...extra,
});

const data: EventData = {
  '1': [ev('p1', '1', '1969-07-20'), ev('p2', '1', '1989-11-09')],
  W: [
    ev('w1', 'W', '1989-11-10', { eventType: 'Splinter', parentID: 'p2' }),
    ev('w2', 'W', '1995-03-01', { journal: 'Rain again on the wall.' }),
  ],
};
// Pages: title, contents, p1, p2, fork, w1, w2
const log = buildBook(data, 'W');
const origin = { parent: '1', eventName: 'Event p2', date: '1989-11-09' };

const controls = (
  overrides: Partial<JournalControls> = {},
): JournalControls => ({
  aiAvailable: false,
  generateJournal: jest.fn().mockResolvedValue(null),
  saveJournal: jest.fn().mockReturnValue(null),
  ...overrides,
});

describe('TerminalLog', () => {
  it('shows the header, index and every record from top to bottom', () => {
    render(<TerminalLog log={log} origin={origin} />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'UNIVERSE W :: CHRONICLE LOG',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'ORIGIN: BRANCHED FROM PRIME UNIVERSE AFTER "EVENT P2" [1989-11-09 THU]',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('RECORDS: 4 (2 INHERITED)')).toBeInTheDocument();

    const index = screen.getByRole('navigation', { name: 'Index' });
    expect(index).toHaveTextContent('[01] THE 1960S');
    expect(index).toHaveTextContent('[03] THE 1990S');

    const stamps = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(stamps).toEqual([
      '[1969-07-20 SUN]',
      '[1989-11-09 THU]',
      '[1989-11-10 FRI]',
      '[1995-03-01 WED]',
    ]);
  });

  it('marks where the universe splits off and where records come from', () => {
    render(<TerminalLog log={log} />);
    expect(screen.getByRole('note')).toHaveTextContent(
      'UNIVERSE W SPLITS FROM PRIME UNIVERSE AFTER "EVENT P2"',
    );
    expect(screen.getAllByText(/\[SRC: PRIME UNIVERSE\]/)).toHaveLength(2);
  });

  it('shows the personal log when there is one, the description otherwise', () => {
    render(<TerminalLog log={log} />);
    expect(screen.getByText('Rain again on the wall.')).toBeInTheDocument();
    expect(screen.queryByText('What happened in w2.')).not.toBeInTheDocument();
    expect(screen.getByText('What happened in w1.')).toBeInTheDocument();
  });

  it('jumps to a year from the command line', async () => {
    const user = userEvent.setup();
    render(<TerminalLog log={log} />);
    await user.type(screen.getByLabelText('> GOTO YEAR'), '1990{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('JUMPING TO 1990');
    expect(screen.getByRole('article', { name: /1995-03-01/ })).toHaveFocus();
  });

  it('explains a command it does not understand', async () => {
    const user = userEvent.setup();
    render(<TerminalLog log={log} />);
    await user.type(screen.getByLabelText('> GOTO YEAR'), 'help{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('UNKNOWN COMMAND');
  });

  it('remembers the first record still on screen after scrolling', async () => {
    const onPositionChange = jest.fn();
    render(<TerminalLog log={log} onPositionChange={onPositionChange} />);
    // Records above page 5 have scrolled off the top.
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const page = Number(this.dataset.page);
        return { bottom: page >= 5 ? 400 : -10 } as DOMRect;
      });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    await waitFor(() => expect(onPositionChange).toHaveBeenCalledWith(5));
    jest.restoreAllMocks();
  });

  it('asks the AI for a personal log only once the record is on screen', async () => {
    const c = controls({ aiAvailable: true });
    render(<TerminalLog log={log} controls={c} />);
    expect(c.generateJournal).not.toHaveBeenCalled();
    showOnScreen(5);
    await waitFor(() => expect(c.generateJournal).toHaveBeenCalledWith('w1'));
    expect(c.generateJournal).toHaveBeenCalledTimes(1);
  });

  it('never asks the AI without a key', () => {
    const c = controls();
    render(<TerminalLog log={log} controls={c} />);
    showOnScreen(5);
    expect(c.generateJournal).not.toHaveBeenCalled();
  });

  it('lets the reader type a personal log', async () => {
    const user = userEvent.setup();
    const c = controls();
    render(<TerminalLog log={log} controls={c} />);
    const writeButtons = screen.getAllByRole('button', {
      name: '[WRITE PERSONAL LOG]',
    });
    await user.click(writeButtons[2]);
    await user.type(
      screen.getByLabelText('PERSONAL LOG FOR EVENT W1'),
      'I saw it myself.',
    );
    await user.click(screen.getByRole('button', { name: '[SAVE]' }));
    expect(c.saveJournal).toHaveBeenCalledWith('w1', 'I saw it myself.');
  });
});

describe('TerminalLog colours', () => {
  it('keeps all text green and shows universe colours only as markers', async () => {
    const { getDivergenceRegister } = await import('@utils/book');
    render(
      <TerminalLog
        log={log}
        colors={{ '1': '#ffb347', W: '#5ee7ff' }}
        register={getDivergenceRegister(data, 'W')}
      />,
    );
    const inherited = screen.getByRole('region', { name: 'Event p1' });
    expect(inherited).not.toHaveAttribute('style');
    expect(inherited).toHaveClass('log-entry--inherited');
    expect(
      screen.getByRole('region', { name: 'Event w1' }),
    ).not.toHaveAttribute('style');
    expect(screen.getByRole('note')).not.toHaveAttribute('style');
    const register = screen.getByRole('region', {
      name: '*** DIVERGENCE REGISTER ***',
    });
    // eslint-disable-next-line testing-library/no-node-access
    const swatches = register.querySelectorAll('.terminal__swatch');
    expect(
      Array.from(swatches, (el) => (el as HTMLElement).style.backgroundColor),
    ).toEqual(['rgb(255, 179, 71)', 'rgb(94, 231, 255)']);
  });
});

describe('divergence register', () => {
  const nested: EventData = {
    ...data,
    X: [ev('x1', 'X', '1996', { eventType: 'Splinter', parentID: 'w2' })],
  };
  const wLog = buildBook(nested, 'W');

  it('lists the lineage from the prime universe and later divergences', async () => {
    const { getDivergenceRegister } = await import('@utils/book');
    render(
      <TerminalLog
        log={wLog}
        register={getDivergenceRegister(nested, 'W')}
        logHrefFor={(id) => `/en/universe/${id}/log`}
      />,
    );
    const register = screen.getByRole('region', {
      name: '*** DIVERGENCE REGISTER ***',
    });
    expect(register).toHaveTextContent('PRIME UNIVERSE ──> to UNIVERSE W');
    expect(register).toHaveTextContent('AFTER "EVENT P2"');
    expect(register).toHaveTextContent('LATER DIVERGENCES (1)');
    expect(register).toHaveTextContent('UNIVERSE W ──> to UNIVERSE X');
    expect(
      screen.getAllByRole('link', { name: 'Open the log of Universe X' })[0],
    ).toHaveAttribute('href', '/en/universe/X/log');
  });

  it('jumps to where a universe splits off', async () => {
    const user = userEvent.setup();
    const { getDivergenceRegister } = await import('@utils/book');
    render(
      <TerminalLog log={wLog} register={getDivergenceRegister(nested, 'W')} />,
    );
    await user.click(
      screen.getByRole('button', { name: 'Go to where Universe W splits off' }),
    );
    expect(screen.getByRole('note')).toHaveFocus();
  });

  it('marks the record a later universe branches from', async () => {
    const { getDivergenceRegister } = await import('@utils/book');
    render(
      <TerminalLog log={wLog} register={getDivergenceRegister(nested, 'W')} />,
    );
    expect(
      screen.getByText(/BRANCH POINT: UNIVERSE X SPLITS OFF HERE/),
    ).toBeInTheDocument();
  });

  it('says when nothing has branched yet', async () => {
    const { getDivergenceRegister } = await import('@utils/book');
    render(
      <TerminalLog log={log} register={getDivergenceRegister(data, 'W')} />,
    );
    expect(screen.getByText(/NONE RECORDED/)).toBeInTheDocument();
  });
});
