import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetroChart from '@components/organisms/MetroChart';
import ChartModeSwitch from '@components/molecules/ChartModeSwitch';
import { EventNode } from 'src/data/events';
import { getTimelineMeta } from '@utils/timelineGraph';

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
  description: '',
  eventType: 'Continuation',
  ...extra,
});

const prime = [ev('p1', '1', '1900'), ev('p2', '1', '1910')];
const branch = [
  ev('a1', 'A', '1911', { eventType: 'Splinter', parentID: 'p2' }),
];
const meta = getTimelineMeta({ '1': prime, A: branch });

const setup = (
  props: Partial<React.ComponentProps<typeof MetroChart>> = {},
) => {
  const onSelectEvent = jest.fn();
  const onSelectUniverse = jest.fn();
  render(
    <MetroChart
      lanes={[prime, branch]}
      meta={meta}
      focusTimeline="all"
      onSelectEvent={onSelectEvent}
      onSelectUniverse={onSelectUniverse}
      {...props}
    />,
  );
  return { onSelectEvent, onSelectUniverse };
};

describe('MetroChart', () => {
  it('selects an event by click or keyboard', async () => {
    const user = userEvent.setup();
    const { onSelectEvent } = setup();
    await user.click(screen.getByRole('button', { name: /^Event p2,/ }));
    expect(onSelectEvent).toHaveBeenLastCalledWith('p2');

    screen.getByRole('button', { name: /^Event a1,/ }).focus();
    await user.keyboard('{Enter}');
    expect(onSelectEvent).toHaveBeenLastCalledWith('a1');
  });

  it('deselects the selected event when clicked again', async () => {
    const user = userEvent.setup();
    const { onSelectEvent } = setup({ selectedEventId: 'p2' });
    const station = screen.getByRole('button', { name: /^Event p2,/ });
    expect(station).toHaveAttribute('aria-pressed', 'true');
    await user.click(station);
    expect(onSelectEvent).toHaveBeenLastCalledWith(null);
  });

  it('opens a universe from its name', async () => {
    const user = userEvent.setup();
    const { onSelectUniverse } = setup();
    await user.click(screen.getByRole('button', { name: 'Universe A' }));
    expect(onSelectUniverse).toHaveBeenCalledWith('A');
  });

  it('marks ancestor lanes as inherited when viewing one universe', () => {
    setup({ focusTimeline: 'A' });
    expect(screen.getByRole('button', { name: 'Universe A' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Prime universe (inherited)' }),
    ).toHaveTextContent('inherited');
  });

  it('labels each date column', () => {
    setup();
    ['1900', '1910', '1911'].forEach((d) =>
      expect(screen.getAllByText(d).length).toBeGreaterThan(0),
    );
  });
});

describe('ChartModeSwitch', () => {
  it('switches between free move and scrolling', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ChartModeSwitch mode="free" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Free move' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Scroll' }));
    expect(onChange).toHaveBeenCalledWith('scroll');
  });
});
