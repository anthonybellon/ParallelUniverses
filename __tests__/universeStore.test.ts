import { builtInData } from 'src/data/builtIn';
import {
  LEGACY_STORAGE_KEY,
  selectSelectedEvent,
  STORAGE_KEY,
  STORAGE_VERSION,
  useUniverseStore,
} from '@store/universeStore';
import { PRIME_TIMELINE_ID } from '@utils/timelineGraph';

const initial = useUniverseStore.getState();
const prime = builtInData[PRIME_TIMELINE_ID];
const fork = prime[prime.length - 1];

const mine = {
  id: 'm1',
  timelineID: 'Mine',
  name: 'My universe begins',
  date: '2030-01-01',
  description: 'Hand written.',
  eventType: 'Splinter' as const,
  parentID: fork.id,
};

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

beforeEach(() => {
  localStorage.clear();
  useUniverseStore.setState(initial, true);
});

describe('universe store', () => {
  it('starts with the built-in universes, viewing the prime one', () => {
    expect(useUniverseStore.getState().events).toEqual(builtInData);
    expect(useUniverseStore.getState().selectedTimeline).toBe(
      PRIME_TIMELINE_ID,
    );
  });

  it('reads an old save under "events" and leaves it in place', async () => {
    // Old saves copied the built-in universes too.
    const oldSave = { ...builtInData, Mine: [mine] };
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(oldSave));

    await useUniverseStore.persist.rehydrate();

    const { events, hydrated } = useUniverseStore.getState();
    expect(hydrated).toBe(true);
    expect(events.Mine).toEqual([mine]);
    expect(events[PRIME_TIMELINE_ID]).toEqual(prime);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(
      JSON.stringify(oldSave),
    );
  });

  it('prefers the new save over the old one', async () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ Old: [{ ...mine, timelineID: 'Old' }] }),
    );
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { userEvents: { Mine: [mine] } },
        version: STORAGE_VERSION,
      }),
    );
    await useUniverseStore.persist.rehydrate();
    const { events } = useUniverseStore.getState();
    expect(events.Mine).toBeDefined();
    expect(events.Old).toBeUndefined();
  });

  it('does not save before saved data has been read', () => {
    useUniverseStore.getState().setSelectedTimeline('all');
    expect(saved()).toBeNull();
  });

  it('saves only what the user made', async () => {
    await useUniverseStore.persist.rehydrate();
    const result = useUniverseStore.getState().addEvent({
      sourceEvent: fork,
      eventType: 'Splinter',
      draft: { name: 'A new start', date: '2030', description: '' },
      newTimelineName: 'Mine',
    });
    expect(result.ok).toBe(true);
    const stored = saved();
    expect(stored.version).toBe(STORAGE_VERSION);
    expect(Object.keys(stored.state.userEvents)).toEqual(['Mine']);
  });

  it('remembers the chart view', async () => {
    await useUniverseStore.persist.rehydrate();
    useUniverseStore.getState().setChartMode('scroll');
    expect(saved().state.chartMode).toBe('scroll');

    useUniverseStore.setState(initial, true);
    await useUniverseStore.persist.rehydrate();
    expect(useUniverseStore.getState().chartMode).toBe('scroll');
  });

  it('clears a selection whose event was deleted', () => {
    const store = useUniverseStore.getState();
    store.addEvent({
      sourceEvent: fork,
      eventType: 'Splinter',
      draft: { name: 'A new start', date: '2030', description: '' },
      newTimelineName: 'Mine',
    });
    store.setSelectedTimeline('Mine');
    const id = useUniverseStore.getState().events.Mine[0].id;
    store.setSelectedEventId(id);
    expect(selectSelectedEvent(useUniverseStore.getState())?.id).toBe(id);

    expect(store.deleteTimeline('Mine').ok).toBe(true);
    const after = useUniverseStore.getState();
    // Falls back to the universe it branched from.
    expect(after.selectedTimeline).toBe(PRIME_TIMELINE_ID);
    expect(after.selectedEventId).toBeNull();
  });

  it('refuses to delete built-in universes', () => {
    const result = useUniverseStore
      .getState()
      .deleteTimeline(PRIME_TIMELINE_ID);
    expect(result.ok).toBe(false);
    expect(useUniverseStore.getState().events).toEqual(builtInData);
  });
});
