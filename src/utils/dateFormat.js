import moment from 'moment';

export const DISPLAY_DATE_FORMAT = 'DD-MMM-YYYY';
export const DISPLAY_DATETIME_FORMAT = 'DD-MMM-YYYY, HH:mm';

/**
 * Safely formats a date string, ISO timestamp, or Date object as DD-MMM-YYYY (e.g. 16-Nov-2026).
 * Preserves local calendar day for date-only YYYY-MM-DD strings without timezone shift.
 * Non-date strings (e.g. "Spot", "Open-Ended") are returned unchanged.
 */
export const formatDate = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const strictIsoDate = moment(trimmed, 'YYYY-MM-DD', true);
    if (strictIsoDate.isValid()) {
      return strictIsoDate.format(DISPLAY_DATE_FORMAT);
    }
  }
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format(DISPLAY_DATE_FORMAT) : String(value);
};

/**
 * Safely formats a timestamp or Date object as DD-MMM-YYYY, HH:mm (e.g. 16-Nov-2026, 14:30).
 */
export const formatDateTime = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format(DISPLAY_DATETIME_FORMAT) : String(value);
};
