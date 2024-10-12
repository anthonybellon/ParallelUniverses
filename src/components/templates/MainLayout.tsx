import React from 'react';
import CollapsibleTreeChart from '@components/organisms/CollapsibleTreeChart';
import EventSelectionForm from '@components/organisms/EventSelectionForm';
import { EventNode } from 'src/data/events';
import { useTranslations } from 'next-intl';

interface MainLayoutProps {
  timelineEvents: EventNode[][];
  timelines: string[];
  selectedTimeline: string | null;
  setSelectedTimeline: (timeline: string | null) => void;
  selectedEvent: EventNode | null;
  setSelectedEvent: (event: EventNode | null) => void;
  addEvent: (
    event: EventNode,
    question: string,
    newTimelineName?: string,
  ) => Promise<void>;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  timelineEvents,
  timelines,
  selectedTimeline,
  setSelectedTimeline,
  selectedEvent,
  setSelectedEvent,
  addEvent,
}) => {
  const t = useTranslations('MainLayout');

  return (
    <div className="flex min-h-screen min-w-full flex-col">
      <header className="bg-gray-200 py-5 text-center">
        <h1 className="text-lg font-semibold">{t('title')}</h1>
      </header>
      <main className="relative grid h-full w-full grid-cols-[3fr_1fr] gap-4">
        <div className="h-[calc(100vh-100px)] w-full overflow-auto">
          <CollapsibleTreeChart data={timelineEvents} />
        </div>
        <div className="h-[calc(100vh-100px)] w-full overflow-auto">
          <EventSelectionForm
            timelines={timelines}
            selectedTimeline={selectedTimeline}
            setSelectedTimeline={setSelectedTimeline}
            events={timelineEvents.flat()}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            addEvent={addEvent}
          />
        </div>
      </main>
      <footer className="bg-gray-200 py-3 text-center text-sm">
        <p>
          &copy; {new Date().getFullYear()} {t('footer')}
        </p>
      </footer>
    </div>
  );
};

export default MainLayout;
