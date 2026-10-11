import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UniversePanel from '@components/organisms/UniversePanel';
import Toaster from '@components/molecules/Toaster';
import { builtInData } from 'src/data/builtIn';
import { EventNode } from 'src/data/events';
import { useUniverseStore } from '@store/universeStore';
import {
  getTimelineMeta,
  orderTimelines,
  PRIME_TIMELINE_ID,
} from '@utils/timelineGraph';

jest.mock('next-intl', () => ({ useLocale: () => 'en' }));

const initial = useUniverseStore.getState();
const prime = builtInData[PRIME_TIMELINE_ID];
const fork = prime[prime.length - 1];

const mine: EventNode[] = [
  {
    id: 'm1',
    timelineID: 'Mine',
    name: 'My universe begins',
    date: '2008',
    description: 'Hand written.',
    eventType: 'Splinter',
    parentID: fork.id,
  },
  {
    id: 'm2',
    timelineID: 'Mine',
    name: 'Things get stranger',
    date: '2010',
    description: '',
    eventType: 'Continuation',
  },
];

const renderPanel = () => {
  const Panel = () => {
    const events = useUniverseStore((s) => s.events);
    return (
      <UniversePanel
        universes={orderTimelines(events)}
        meta={getTimelineMeta(events)}
      />
    );
  };
  return render(
    <>
      <Panel />
      <Toaster />
    </>,
  );
};

beforeEach(() => {
  useUniverseStore.setState(
    {
      ...initial,
      events: { ...builtInData, Mine: mine },
      aiAvailable: false,
      hydrated: true,
    },
    true,
  );
});

describe('UniversePanel', () => {
  it('opens on the prime universe with a hint', () => {
    renderPanel();
    expect(
      screen.getByRole('heading', { name: 'Prime universe' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open log' })).toHaveAttribute(
      'href',
      '/en/universe/1/log',
    );
    expect(
      screen.queryByRole('button', { name: 'Delete universe' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Select an event on the chart/),
    ).toBeInTheDocument();
  });

  it('offers to branch from a prime event but not to continue it', () => {
    useUniverseStore.setState({ selectedEventId: fork.id });
    renderPanel();
    expect(
      screen.getByRole('button', { name: 'Branch into a new universe' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continue this universe' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Open log' }).at(-1),
    ).toHaveAttribute('href', `/en/universe/1/log?event=${fork.id}`);
  });

  it('branches into a new universe and shows it', async () => {
    const user = userEvent.setup();
    useUniverseStore.setState({ selectedEventId: fork.id });
    renderPanel();

    await user.click(
      screen.getByRole('button', { name: 'Branch into a new universe' }),
    );
    await user.type(
      screen.getByLabelText('Name of the new universe'),
      'Bailout',
    );
    await user.type(screen.getByLabelText('What happens'), 'Banks are rescued');
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '2008-10-03');
    await user.click(screen.getByRole('button', { name: 'Add event' }));

    const state = useUniverseStore.getState();
    expect(state.events.Bailout).toHaveLength(1);
    expect(state.selectedTimeline).toBe('Bailout');
    expect(state.selectedEventId).toBe(state.events.Bailout[0].id);
    expect(
      screen.getByText('Universe "Bailout" begins with "Banks are rescued".'),
    ).toBeInTheDocument();
  });

  it('edits an event the user made', async () => {
    const user = userEvent.setup();
    useUniverseStore.setState({
      selectedTimeline: 'Mine',
      selectedEventId: 'm2',
    });
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '2000');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /can't be dated before/,
    );

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Stranger still');
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '2011');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(useUniverseStore.getState().events.Mine[1]).toMatchObject({
      name: 'Stranger still',
      date: '2011',
    });
  });

  it('never offers to edit or delete built-in events', () => {
    useUniverseStore.setState({ selectedEventId: fork.id });
    renderPanel();
    expect(
      screen.queryByRole('button', { name: 'Edit' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete event' }),
    ).not.toBeInTheDocument();
  });

  it('deletes an event and undoes it', async () => {
    const user = userEvent.setup();
    useUniverseStore.setState({
      selectedTimeline: 'Mine',
      selectedEventId: 'm2',
    });
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Delete event' }));
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(useUniverseStore.getState().events.Mine.map((e) => e.id)).toEqual([
      'm1',
    ]);

    expect(
      screen.getByText('Deleted "Things get stranger".'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useUniverseStore.getState().events.Mine.map((e) => e.id)).toEqual([
      'm1',
      'm2',
    ]);
    expect(useUniverseStore.getState().selectedEventId).toBe('m2');
  });

  it('deletes a universe, shows its parent, and undoes it', async () => {
    const user = userEvent.setup();
    useUniverseStore.setState({ selectedTimeline: 'Mine' });
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Delete universe' }));
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(useUniverseStore.getState().events.Mine).toBeUndefined();
    expect(useUniverseStore.getState().selectedTimeline).toBe(
      PRIME_TIMELINE_ID,
    );

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useUniverseStore.getState().events.Mine).toHaveLength(2);
    expect(useUniverseStore.getState().selectedTimeline).toBe('Mine');
  });

  it('refuses to undo once something else has changed', () => {
    const store = useUniverseStore.getState();
    store.deleteEvent('m2');
    act(() => {
      store.editEvent('m1', { name: 'Renamed' });
    });
    expect(useUniverseStore.getState().undoDelete()).toBe(false);
    expect(useUniverseStore.getState().events.Mine).toHaveLength(1);
  });
});
