import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainLayout from '@components/templates/MainLayout';
import { EventNode } from 'src/data/events';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: { [key: string]: string } = {
      title: 'Parallel Universe Maker',
    };
    return translations[key];
  },
}));

// Mock the ReactECharts component to prevent canvas-related errors
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
