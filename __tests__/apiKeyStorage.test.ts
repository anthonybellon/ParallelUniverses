import {
  aiHeaders,
  clearApiKey,
  loadApiKey,
  maskApiKey,
  saveApiKey,
} from '@utils/apiKey';

const KEY = 'sk-proj-0123456789abcdefghijklmn';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('the user key in the browser', () => {
  it('lasts only for the session unless remembered', () => {
    saveApiKey(KEY, false);
    expect(sessionStorage.length).toBe(1);
    expect(localStorage.length).toBe(0);
    expect(loadApiKey()).toEqual({ key: KEY, remember: false });

    saveApiKey(KEY, true);
    expect(sessionStorage.length).toBe(0);
    expect(loadApiKey()).toEqual({ key: KEY, remember: true });
  });

  it('is sent with AI requests only when set', () => {
    expect(aiHeaders()).toEqual({});
    saveApiKey(KEY, false);
    expect(aiHeaders()).toEqual({ 'x-openai-key': KEY });
    clearApiKey();
    expect(aiHeaders()).toEqual({});
  });

  it('is shown masked', () => {
    expect(maskApiKey(KEY)).toBe('sk-…klmn');
  });
});
