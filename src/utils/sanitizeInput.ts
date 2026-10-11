/** Longest text, in characters, each field accepts. */
export const TEXT_LIMITS = {
  name: 200,
  date: 60,
  description: 4000,
  question: 1000,
  timelineName: 80,
} as const;

// Control characters other than tab and newline. They have no place in an
// event and can hide text from the person reading it.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Cleans free text before it is stored or sent to the AI. Punctuation,
 * accents and other scripts are kept; only control characters are removed and
 * the result is trimmed and cut to `maxLength`.
 *
 * This does not make text safe to put in HTML. React escapes text it renders;
 * anywhere else, use `escapeHtml` at the point of output.
 */
export function sanitizeInput(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, '')
    .trim()
    .slice(0, maxLength)
    .trim();
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\u0027': '&#39;',
};

/** Escapes text for use inside an HTML string. */
export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
