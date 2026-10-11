const MODERATION_URL = 'https://api.openai.com/v1/moderations';

interface ModerationResponse {
  results: { flagged: boolean }[];
}

/** True when OpenAI's moderation endpoint flags the text. Throws if the check fails. */
export const isFlagged = async (
  text: string,
  apiKey: string,
): Promise<boolean> => {
  const res = await fetch(MODERATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: 'omni-moderation-latest', input: text }),
  });
  if (!res.ok) {
    throw Object.assign(
      new Error(`Moderation failed with status ${res.status}`),
      { status: res.status },
    );
  }
  const body = (await res.json()) as ModerationResponse;
  return body.results.some((r) => r.flagged);
};
