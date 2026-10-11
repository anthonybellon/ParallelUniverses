import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiKeyDialog from '@components/molecules/ApiKeyDialog';
import { useUniverseStore } from '@store/universeStore';
import { loadApiKey } from '@utils/apiKey';

const KEY = 'sk-proj-0123456789abcdefghijklmn';
const initial = useUniverseStore.getState();

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useUniverseStore.setState(
    { ...initial, serverAi: false, aiAvailable: false },
    true,
  );
});

const respond = (status: number, body: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
};

describe('ApiKeyDialog', () => {
  it('shows that AI is off without a key', () => {
    render(<ApiKeyDialog />);
    expect(
      screen.getByRole('button', { name: /AI: OFFLINE/ }),
    ).toBeInTheDocument();
  });

  it('checks a key with OpenAI, then keeps it for the session', async () => {
    const user = userEvent.setup();
    respond(200, { valid: true });
    render(<ApiKeyDialog />);

    await user.click(screen.getByRole('button', { name: /AI: OFFLINE/ }));
    await user.type(screen.getByLabelText('Your OpenAI API key'), KEY);
    await user.click(screen.getByRole('button', { name: 'Test and save' }));

    expect(global.fetch).toHaveBeenCalledWith('/api/ai-key', {
      method: 'POST',
      headers: { 'x-openai-key': KEY },
    });
    await waitFor(() =>
      expect(useUniverseStore.getState().userKeyHint).toBe('sk-…klmn'),
    );
    expect(useUniverseStore.getState().aiAvailable).toBe(true);
    expect(loadApiKey()).toEqual({ key: KEY, remember: false });
    expect(
      screen.getByRole('button', { name: /AI: YOUR KEY sk-…klmn/ }),
    ).toBeInTheDocument();
  });

  it('remembers the key on this device when asked', async () => {
    const user = userEvent.setup();
    respond(200, { valid: true });
    render(<ApiKeyDialog />);
    await user.click(screen.getByRole('button', { name: /AI: OFFLINE/ }));
    await user.type(screen.getByLabelText('Your OpenAI API key'), KEY);
    await user.click(screen.getByLabelText(/Remember on this device/));
    await user.click(screen.getByRole('button', { name: 'Test and save' }));
    await waitFor(() => expect(loadApiKey()?.remember).toBe(true));
  });

  it('keeps nothing when OpenAI rejects the key', async () => {
    const user = userEvent.setup();
    respond(401, { valid: false, error: 'OpenAI rejected this key.' });
    render(<ApiKeyDialog />);
    await user.click(screen.getByRole('button', { name: /AI: OFFLINE/ }));
    await user.type(screen.getByLabelText('Your OpenAI API key'), KEY);
    await user.click(screen.getByRole('button', { name: 'Test and save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'OpenAI rejected this key.',
    );
    expect(loadApiKey()).toBeNull();
    expect(useUniverseStore.getState().userKeyHint).toBeNull();
  });

  it('removes the key', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('parallel-universes-openai-key', KEY);
    useUniverseStore.getState().setUserKeyHint('sk-…klmn');
    render(<ApiKeyDialog />);
    await user.click(screen.getByRole('button', { name: /AI: YOUR KEY/ }));
    await user.click(screen.getByRole('button', { name: 'Remove my key' }));
    expect(loadApiKey()).toBeNull();
    expect(useUniverseStore.getState().aiAvailable).toBe(false);
  });
});
