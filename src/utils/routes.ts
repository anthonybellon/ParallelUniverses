/** Link to a universe's log, opened at an event when one is given. */
export const logHref = (
  locale: string,
  timelineID: string,
  eventId?: string,
): string =>
  `/${locale}/universe/${encodeURIComponent(timelineID)}/log${
    eventId ? `?event=${encodeURIComponent(eventId)}` : ''
  }`;

/** Reads a universe ID from the URL whether or not it arrives encoded. */
export const universeFromParam = (
  param: string,
  exists: (id: string) => boolean,
): string => {
  let decoded = param;
  try {
    decoded = decodeURIComponent(param);
  } catch {
    // Not valid percent-encoding; use it as it is.
  }
  return exists(decoded) || !exists(param) ? decoded : param;
};
