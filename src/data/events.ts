interface Event {
  date: string;
  title: string;
  description: string;
}

const events: Event[] = [
  {
    date: '1903',
    title: 'First Powered Flight',
    description: 'The Wright brothers achieve the first powered flight.',
  },
  {
    date: '1914',
    title: 'Start of World War I',
    description:
      'World War I begins after the assassination of Archduke Franz Ferdinand.',
  },
  {
    date: '1969',
    title: 'Moon Landing',
    description: 'Apollo 11 lands the first humans on the Moon.',
  },
  {
    date: '1989',
    title: 'Fall of the Berlin Wall',
    description: 'The Berlin Wall falls, symbolizing the end of the Cold War.',
  },
  // Add more events as needed
];

export default events;
