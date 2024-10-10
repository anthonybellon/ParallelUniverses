export interface EventNode {
  id: string;
  name: string;
  date: string;
  description: string;
  parent?: string;
  splinterId?: string;
  children?: EventNode[];
}

export const events: EventNode[] = [
  {
    id: '1',
    name: 'First Powered Flight',
    date: '1903-01-01',
    description: 'The Wright brothers achieve the first powered flight.',
    children: [
      {
        id: '2',
        name: 'Start of World War I',
        date: '1914-07-28',
        description:
          'WWI begins after the assassination of Archduke Franz Ferdinand.',
        parent: '1',
        children: [
          {
            id: '3',
            name: 'Moon Landing',
            date: '1969-07-20',
            description: 'Apollo 11 lands the first humans on the Moon.',
            parent: '2',
            children: [
              {
                id: '4',
                name: 'Fall of the Berlin Wall',
                date: '1989-11-09',
                description: 'Marks the symbolic end of the Cold War.',
                parent: '3',
                children: [],
              },
            ],
          },
          {
            id: '3a',
            name: 'Moon Race Lost',
            date: '1969-07-20',
            description:
              'The Soviets land on the Moon first, changing the course of the Cold War.',
            parent: '2',
            splinterId: '3',
            children: [
              {
                id: '4a',
                name: 'Alternative Fall of the Berlin Wall',
                date: '1990-11-09',
                description:
                  'The Cold War extends due to intensified Soviet influence.',
                parent: '3a',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
];
