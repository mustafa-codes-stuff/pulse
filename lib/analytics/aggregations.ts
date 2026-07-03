import { PulseConversation } from '../types';
import { calculatePercentile } from './stats';
import { format, fromUnixTime } from 'date-fns';

export interface DailyVolume {
  date: string; // YYYY-MM-DD
  total: number;
  open: number;
  closed: number;
  snoozed: number;
}

export function aggregateDailyVolume(conversations: PulseConversation[]): DailyVolume[] {
  const map = new Map<string, DailyVolume>();
  
  for (const conv of conversations) {
    const dateStr = format(fromUnixTime(conv.created_at), 'yyyy-MM-dd');
    if (!map.has(dateStr)) {
      map.set(dateStr, { date: dateStr, total: 0, open: 0, closed: 0, snoozed: 0 });
    }
    const record = map.get(dateStr)!;
    record.total++;
    
    if (conv.state === 'open') record.open++;
    else if (conv.state === 'closed') record.closed++;
    else if (conv.state === 'snoozed') record.snoozed++;
  }
  
  // Sort by date
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface PercentileMetrics {
  p50: number | null;
  p90: number | null;
  p99: number | null;
}

export function calculateResponseTimePercentiles(conversations: PulseConversation[]): {
  timeToAdminReply: PercentileMetrics;
  timeToFirstClose: PercentileMetrics;
} {
  const replyTimes = conversations
    .map(c => c.statistics?.time_to_admin_reply)
    .filter((t): t is number => typeof t === 'number' && t !== null)
    .sort((a, b) => a - b);
    
  const closeTimes = conversations
    .map(c => c.statistics?.time_to_first_close)
    .filter((t): t is number => typeof t === 'number' && t !== null)
    .sort((a, b) => a - b);
    
  return {
    timeToAdminReply: {
      p50: calculatePercentile(replyTimes, 50),
      p90: calculatePercentile(replyTimes, 90),
      p99: calculatePercentile(replyTimes, 99),
    },
    timeToFirstClose: {
      p50: calculatePercentile(closeTimes, 50),
      p90: calculatePercentile(closeTimes, 90),
      p99: calculatePercentile(closeTimes, 99),
    }
  };
}

export function aggregateCSAT(conversations: PulseConversation[]): { rating: number; count: number }[] {
  const counts = [0, 0, 0, 0, 0];
  
  for (const conv of conversations) {
    if (conv.conversation_rating?.rating) {
      const r = Math.round(conv.conversation_rating.rating);
      if (r >= 1 && r <= 5) {
        counts[r - 1]++;
      }
    }
  }
  
  return counts.map((count, i) => ({ rating: i + 1, count }));
}
