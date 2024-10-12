import { determineIntent } from '@utils/intentDectection';
import { sanitizeInput } from '@utils/sanitizeInput';

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (typeof content !== 'string') {
      console.error('Expected a string but received:', typeof content);
      return new Response(JSON.stringify({ error: 'Invalid content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sanitizedContent = sanitizeInput(content);
    const result = await determineIntent(sanitizedContent);
    const { intent } = JSON.parse(result);

    return new Response(JSON.stringify({ intent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    console.error('Error processing request:', e);
    if (e instanceof Error) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 'status' in e && typeof e.status === 'number' ? e.status : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(
        JSON.stringify({ error: 'An unknown error occurred' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  }
}
