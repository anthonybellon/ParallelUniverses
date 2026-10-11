/**
 * Breaks a chart label into short lines at spaces, so it fits its column.
 * Words longer than a line are split; text past the last line ends in "…".
 */
export const wrapLabel = (
  text: string,
  maxChars: number,
  maxLines = 2,
): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  let overflow = false;

  const push = (line: string) => {
    if (lines.length < maxLines) lines.push(line);
    else overflow = true;
  };

  words.forEach((word) => {
    let rest = word;
    while (rest.length > maxChars) {
      if (current) {
        push(current);
        current = '';
      }
      push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    const next = current ? `${current} ${rest}` : rest;
    if (next.length <= maxChars) {
      current = next;
    } else {
      push(current);
      current = rest;
    }
  });
  if (current) push(current);

  if (overflow && lines.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] =
      last.length >= maxChars ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
  }
  return lines;
};

/** Characters per line for event titles on both charts. */
export const LABEL_CHARS = 15;
