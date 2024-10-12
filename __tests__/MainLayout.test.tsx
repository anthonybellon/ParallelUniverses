import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainLayout from '@components/templates/MainLayout';
import { EventNode } from 'src/data/events';

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    onAuthStateChanged: jest.fn((_, callback) => {
      callback(null); // Mock no user
      return jest.fn(); // Mock unsubscribe function
    }),
  })),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(),
  isSupported: jest.fn().mockResolvedValue(false),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: { [key: string]: string } = {
      title: 'Parallel Universe Maker',
    };
    return translations[key];
  },
}));

// Mock ReactECharts to avoid canvas-related issues
jest.mock('echarts-for-react', () => () => (
  <div data-testid="echarts-mock">ECharts Mock</div>
));

describe('MainLayout Component', () => {
  const mockTimelineEvents: EventNode[][] = [
    [
      {
        id: '1',
        name: 'First Powered Flight',
        date: '1903-01-01',
        description: 'The Wright brothers achieve the first powered flight.',
        timelineID: '1',
        eventType: 'Continuation',
        embellishments: [
          'The flight took place at Kitty Hawk, North Carolina.',
          'The plane was called the Flyer and had a wingspan of 12.3 meters.',
        ],
        parentID: undefined,
      },
      {
        id: '2',
        name: 'Start of World War I',
        date: '1914-07-28',
        description:
          'WWI begins after the assassination of Archduke Franz Ferdinand.',
        timelineID: '1',
        eventType: 'Continuation',
      },
    ],
  ];

  beforeEach(() => {
    render(
      <MainLayout
        timelineEvents={mockTimelineEvents}
        timelines={['Timeline 1', 'Timeline 2']}
        selectedTimeline="Timeline 1"
        setSelectedTimeline={() => {}}
        selectedEvent={null}
        setSelectedEvent={() => {}}
        addEvent={async () => {}}
      />,
    );
  });

  it('renders the title correctly', () => {
    const titleElement = screen.getByRole('heading', {
      name: 'Parallel Universe Maker',
    });
    expect(titleElement).toBeInTheDocument();
  });

  it('renders the ECharts mock', () => {
    const echartsMock = screen.getByTestId('echarts-mock');
    expect(echartsMock).toBeInTheDocument();
  });
});
