export function sanitizeInput(
  input: string | undefined | null,
  type: 'text' | 'date' = 'text',
): string {
  if (!input) return '';

  if (type === 'date') {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (datePattern.test(input)) {
      return input;
    } else {
      console.error(
        `Invalid date format for input: ${input}. Expected 'YYYY-MM-DD'.`,
      );
      return '';
    }
  }
  return input.replace(/[^a-zA-Z0-9 ]/g, '').trim();
}
