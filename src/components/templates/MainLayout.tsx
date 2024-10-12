import React from 'react';
import CollapsibleTreeChart from '@components/organisms/CollapsibleTreeChart';
import EventSelectionForm from '@components/organisms/EventSelectionForm';
import { EventNode } from 'src/data/events';
import { useTranslations } from 'next-intl';
// import { useRouter } from 'next/navigation';
// import { Button } from '@components/ui/button';
// import { useUser } from '../../context/UserContext';
// import UserDropdown from '@components/molecules/UserDropdown';

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
  // const router = useRouter();
  // const { user, loading } = useUser();
  // const handleAuthRedirect = () => {
  //   router.push('/auth');
  // };
  return (
    <div className="flex min-h-screen min-w-full flex-col">
      <header className="flex grid-flow-row justify-between bg-gray-200 p-5">
        <h1 className="pt-1 text-lg font-semibold">{t('title')}</h1>
        {/* {!loading && user ? (
          <UserDropdown
            photoURL={user.photoURL}
            displayName={user.displayName || user.email}
            email={user.email}
            handleAuthRedirect={handleAuthRedirect}
          />
        ) : (
          <Button variant="outline" onClick={handleAuthRedirect}>
            Login / Register
          </Button>
        )} */}
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
        <p>&copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default MainLayout;
