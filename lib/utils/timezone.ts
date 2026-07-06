import { format } from 'date-fns';

const PULSE_TZ = 'America/Los_Angeles';

export function formatPT(unixSeconds: number, pattern: string): string {
  const date = new Date(unixSeconds * 1000);
  const tzString = date.toLocaleString('en-US', { timeZone: PULSE_TZ });
  const ptDate = new Date(tzString);
  return format(ptDate, pattern);
}
