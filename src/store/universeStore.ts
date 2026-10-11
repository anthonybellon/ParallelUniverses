import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { builtInData, protectedIDs } from 'src/data/builtIn';
import { EventNode } from 'src/data/events';
import {
  addEvent,
  AddEventInput,
  AddResult,
  deleteEvent,
  deleteTimeline,
  editEvent,
  EditResult,
  EventData,
  EventPatch,
  findEvent,
  getForkEvent,
  MutationResult,
  PRIME_TIMELINE_ID,
} from '@utils/timelineGraph';
import {
  importUserData,
  ImportResult,
  mergeStoredData,
  toStoredData,
  toStoredJournals,
} from '@utils/storage';
import { isPaletteColor, parseColorOverrides } from '@utils/palette';

/** localStorage key for the store. */
export const STORAGE_KEY = 'parallel-universes';
/** Where saves lived before the store existed. Read once, never written. */
export const LEGACY_STORAGE_KEY = 'events';
export const STORAGE_VERSION = 1;

/** What is written to storage. Built-in data is left out. */
export interface PersistedUniverseState {
  /** Universes and events the user made, keyed by universe. */
  userEvents: EventData;
  /** Diary entries for built-in events, keyed by event ID. */
  builtInJournals?: Record<string, string>;
  /** Last page read in each universe's book. */
  bookPages?: Record<string, number>;
  /** How the chart is shown. */
  chartMode?: ChartMode;
  /** Colours people picked, keyed by universe. */
  universeColors?: Record<string, string>;
}

/** 'free' pans and zooms on a time scale; 'scroll' is a metro map that scrolls sideways. */
export type ChartMode = 'free' | 'scroll';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
  action?: { label: string; onAction: () => void };
}

/** What a delete removed, so it can be undone. */
interface UndoSnapshot {
  label: string;
  /** Data before the delete. */
  before: EventData;
  /** Data right after it. Undo only works while nothing else has changed. */
  after: EventData;
  selectedTimeline: string | null;
  selectedEventId: string | null;
}

export interface UniverseState {
  /** Built-in and user data together. */
  events: EventData;
  /** False until saved data has been read from storage. */
  hydrated: boolean;
  /** A universe ID, or 'all'. Starts on the prime universe. */
  selectedTimeline: string | null;
  selectedEventId: string | null;
  /** Whether AI generation can run, with either key. Null while checking. */
  aiAvailable: boolean | null;
  /** Whether the server has its own key. Null while checking. */
  serverAi: boolean | null;
  /** The user's own key, masked, when they added one. Never saved here. */
  userKeyHint: string | null;
  /** Last page read in each universe's book. */
  bookPages: Record<string, number>;
  toasts: Toast[];
  lastDeleted: UndoSnapshot | null;
  chartMode: ChartMode;
  /** Colours people picked, keyed by universe. */
  universeColors: Record<string, string>;

  setSelectedTimeline: (timelineID: string | null) => void;
  setSelectedEventId: (eventId: string | null) => void;
  /** Records whether the server has a key. */
  setAiAvailable: (available: boolean) => void;
  setUserKeyHint: (hint: string | null) => void;
  setChartMode: (mode: ChartMode) => void;
  /** Picks a palette colour for a universe, or null for its default. */
  setUniverseColor: (timelineID: string, color: string | null) => void;
  /** Adds an event. The new event is not selected. */
  addEvent: (input: Omit<AddEventInput, 'id'>) => AddResult;
  deleteEvent: (eventId: string) => MutationResult;
  deleteTimeline: (timelineID: string) => MutationResult;
  editEvent: (eventId: string, patch: EventPatch) => EditResult;
  setBookPage: (timelineID: string, page: number) => void;
  /** Puts back what the last delete removed. False if that's no longer possible. */
  undoDelete: () => boolean;
  /** Adds universes and events from an exported file. */
  importData: (file: unknown) => ImportResult;
  pushToast: (toast: Omit<Toast, 'id'>) => number;
  dismissToast: (id: number) => void;
}

/**
 * Storage that falls back to the pre-store save under "events" the first
 * time, so nobody loses their universes. The old key is left alone.
 *
 * Nothing is written until saved data has been read, so a change made before
 * then can't overwrite the save with the defaults.
 */
const storageWithLegacyFallback: StateStorage = {
  getItem: (name) => {
    const current = localStorage.getItem(name);
    if (current !== null || name !== STORAGE_KEY) return current;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === null) return null;
    try {
      return JSON.stringify({
        state: { userEvents: JSON.parse(legacy) },
        version: 0,
      });
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (useUniverseStore.getState().hydrated) localStorage.setItem(name, value);
  },
  removeItem: (name) => localStorage.removeItem(name),
};

export const useUniverseStore = create<UniverseState>()(
  persist(
    (set, get) => {
      let nextToastId = 1;

      // Applies a successful change and drops a selection that no longer
      // exists. Any change other than a delete ends the chance to undo.
      const commit = (
        data: EventData,
        {
          removedTimelines = [],
          fallbackTimeline = PRIME_TIMELINE_ID,
          undo = null,
        }: {
          removedTimelines?: string[];
          fallbackTimeline?: string;
          undo?: UndoSnapshot | null;
        } = {},
      ) => {
        const { selectedTimeline, selectedEventId } = get();
        set({
          events: data,
          lastDeleted: undo,
          selectedTimeline:
            selectedTimeline && removedTimelines.includes(selectedTimeline)
              ? fallbackTimeline
              : selectedTimeline,
          selectedEventId:
            selectedEventId && findEvent(data, selectedEventId)
              ? selectedEventId
              : null,
        });
      };

      const snapshot = (label: string, after: EventData): UndoSnapshot => {
        const { events, selectedTimeline, selectedEventId } = get();
        return {
          label,
          before: events,
          after,
          selectedTimeline,
          selectedEventId,
        };
      };

      return {
        events: builtInData,
        hydrated: false,
        selectedTimeline: PRIME_TIMELINE_ID,
        selectedEventId: null,
        aiAvailable: null,
        serverAi: null,
        userKeyHint: null,
        bookPages: {},
        toasts: [],
        lastDeleted: null,
        chartMode: 'free',
        universeColors: {},

        setSelectedTimeline: (selectedTimeline) =>
          set({ selectedTimeline, selectedEventId: null }),
        setSelectedEventId: (selectedEventId) => set({ selectedEventId }),
        setAiAvailable: (serverAi) =>
          set((state) => ({
            serverAi,
            aiAvailable: serverAi || !!state.userKeyHint,
          })),
        setUserKeyHint: (userKeyHint) =>
          set((state) => ({
            userKeyHint,
            aiAvailable: userKeyHint ? true : state.serverAi,
          })),
        setChartMode: (chartMode) => set({ chartMode }),
        setUniverseColor: (timelineID, color) =>
          set((state) => {
            const next = { ...state.universeColors };
            if (color && isPaletteColor(color)) next[timelineID] = color;
            else delete next[timelineID];
            return { universeColors: next };
          }),

        addEvent: (input) => {
          const result = addEvent(get().events, input);
          if (result.ok) commit(result.data);
          return result;
        },
        editEvent: (eventId, patch) => {
          const result = editEvent(get().events, eventId, patch, protectedIDs);
          if (result.ok) commit(result.data);
          return result;
        },
        deleteEvent: (eventId) => {
          const event = findEvent(get().events, eventId);
          const result = deleteEvent(get().events, eventId, protectedIDs);
          if (result.ok) {
            commit(result.data, {
              undo: snapshot(`"${event?.name}"`, result.data),
            });
          }
          return result;
        },
        deleteTimeline: (timelineID) => {
          const { events } = get();
          const parent = getForkEvent(events, timelineID)?.timelineID;
          const result = deleteTimeline(events, timelineID, protectedIDs);
          if (result.ok) {
            const count = result.removedTimelines.length;
            commit(result.data, {
              removedTimelines: result.removedTimelines,
              fallbackTimeline:
                parent && result.data[parent] ? parent : PRIME_TIMELINE_ID,
              undo: snapshot(
                count > 1 ? `${count} universes` : `universe "${timelineID}"`,
                result.data,
              ),
            });
          }
          return result;
        },
        undoDelete: () => {
          const { lastDeleted, events } = get();
          if (!lastDeleted || lastDeleted.after !== events) return false;
          set({
            events: lastDeleted.before,
            selectedTimeline: lastDeleted.selectedTimeline,
            selectedEventId: lastDeleted.selectedEventId,
            lastDeleted: null,
          });
          return true;
        },
        importData: (file) => {
          const result = importUserData(get().events, builtInData, file);
          if (result.ok) {
            commit(result.data);
            // Imported colours fill in, but never replace a choice made here.
            const imported = parseColorOverrides(
              (file as { universeColors?: unknown } | null)?.universeColors,
            );
            set((state) => ({
              universeColors: { ...imported, ...state.universeColors },
            }));
          }
          return result;
        },

        setBookPage: (timelineID, page) =>
          set((state) => ({
            bookPages: { ...state.bookPages, [timelineID]: page },
          })),

        pushToast: (toast) => {
          const id = nextToastId++;
          set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
          return id;
        },
        dismissToast: (id) =>
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      };
    },
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => storageWithLegacyFallback),
      // Rehydrated from a client effect so the server and first client
      // render agree.
      skipHydration: true,
      partialize: (state): PersistedUniverseState => ({
        userEvents: toStoredData(state.events, builtInData),
        builtInJournals: toStoredJournals(state.events, builtInData),
        bookPages: state.bookPages,
        chartMode: state.chartMode,
        universeColors: state.universeColors,
      }),
      // Version 0 is the old "events" save. It already has the userEvents
      // shape once read, and mergeStoredData drops the built-in copies in it.
      migrate: (persisted) => persisted as PersistedUniverseState,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PersistedUniverseState>;
        return {
          ...current,
          events: mergeStoredData(
            builtInData,
            saved.userEvents,
            saved.builtInJournals,
          ),
          bookPages:
            saved.bookPages && typeof saved.bookPages === 'object'
              ? saved.bookPages
              : {},
          chartMode: saved.chartMode === 'scroll' ? 'scroll' : 'free',
          universeColors: parseColorOverrides(saved.universeColors),
        };
      },
      // Marks the store hydrated, then saves once so the data is written in
      // the current shape.
      onRehydrateStorage: () => () => {
        useUniverseStore.setState({ hydrated: true });
      },
    },
  ),
);

/** The selected event, looked up fresh so it never goes stale. */
export const selectSelectedEvent = (state: UniverseState): EventNode | null =>
  state.selectedEventId
    ? (findEvent(state.events, state.selectedEventId) ?? null)
    : null;
