import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorPicker from '@components/molecules/ColorPicker';
import { useUniverseStore } from '@store/universeStore';
import { builtInData } from 'src/data/builtIn';
import { toExportFile } from '@utils/storage';
import { parseColorOverrides, withColorOverrides } from '@utils/palette';

const initial = useUniverseStore.getState();
beforeEach(() => useUniverseStore.setState(initial, true));

describe('universe colours', () => {
  it('only keeps colours from the readable palette', () => {
    const store = useUniverseStore.getState();
    store.setUniverseColor('2', '#5ee7ff');
    store.setUniverseColor('1', '#ff0000');
    expect(useUniverseStore.getState().universeColors).toEqual({
      '2': '#5ee7ff',
    });
    useUniverseStore.getState().setUniverseColor('2', null);
    expect(useUniverseStore.getState().universeColors).toEqual({});
  });

  it('applies picked colours over the defaults', () => {
    const meta = { '1': { color: '#7dff9b' }, '2': { color: '#ffb347' } };
    expect(withColorOverrides(meta, { '2': '#5ee7ff' })['2'].color).toBe(
      '#5ee7ff',
    );
    expect(withColorOverrides(meta, { '2': 'red' })['2'].color).toBe('#ffb347');
  });

  it('goes out with an export and fills gaps on import', () => {
    const file = toExportFile(builtInData, builtInData, new Date(), {
      '2': '#5ee7ff',
    });
    expect(file.universeColors).toEqual({ '2': '#5ee7ff' });

    useUniverseStore.getState().setUniverseColor('1', '#ffb347');
    useUniverseStore.getState().importData({
      ...file,
      universeColors: { '1': '#bfaeff', '2': '#5ee7ff', x: 'bad' },
    });
    expect(useUniverseStore.getState().universeColors).toEqual({
      '1': '#ffb347',
      '2': '#5ee7ff',
    });
    expect(parseColorOverrides({ a: 'nope' })).toEqual({});
  });
});

describe('ColorPicker', () => {
  it('picks a colour or goes back to the default', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <ColorPicker
        label="Colour of Universe 2"
        value="#ffb347"
        custom={false}
        onChange={onChange}
      />,
    );
    const group = screen.getByRole('group', { name: 'Colour of Universe 2' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Cyan' }));
    expect(onChange).toHaveBeenCalledWith('#5ee7ff');
    await user.click(screen.getByRole('button', { name: 'Auto' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
