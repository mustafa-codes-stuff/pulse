import { PulseConversation, ConversationPart } from '../types';
import { classifyConversation, generateFallbackTitle } from '../nlp/heuristics';
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

export interface AgentMetrics {
  id: string;
  name: string;
  volume: number;
  medianTimeToReply: number | null;
  csatTotal: number;
  csatCount: number;
  csatAvg: number | null;
  frictionCount: number;
  frictionRate: number;
}

export function aggregateAgentPerformance(conversations: PulseConversation[]): AgentMetrics[] {
  const map = new Map<string, { name: string; replies: number[]; volume: number; csatTotal: number; csatCount: number; frictionCount: number }>();
  
  const p90 = calculateHighFrictionP90(conversations);

  for (const conv of conversations) {
    const adminParts = conv.conversation_parts?.conversation_parts?.filter(p => p.author?.type === 'admin') || [];
    if (adminParts.length === 0) continue;
    
    const firstAdminPart = adminParts[0];
    const agentName = firstAdminPart.author?.name || 'Unknown Agent';
    const agentId = String(firstAdminPart.author?.id || 'unknown');

    if (!map.has(agentId)) {
      map.set(agentId, { name: agentName, replies: [], volume: 0, csatTotal: 0, csatCount: 0, frictionCount: 0 });
    }
    const record = map.get(agentId)!;
    
    record.volume += 1;
    if (conv.statistics?.time_to_admin_reply != null) {
      record.replies.push(conv.statistics.time_to_admin_reply);
    }
    
    if (conv.conversation_rating?.rating) {
      record.csatTotal += conv.conversation_rating.rating;
      record.csatCount += 1;
    }
    
    if (isHighFriction(conv, p90)) {
      record.frictionCount += 1;
    }
  }

  const results: AgentMetrics[] = [];
  for (const [id, record] of map.entries()) {
    record.replies.sort((a, b) => a - b);
    const median = calculatePercentile(record.replies, 50);
    results.push({
      id,
      name: record.name,
      volume: record.volume,
      medianTimeToReply: median,
      csatTotal: record.csatTotal,
      csatCount: record.csatCount,
      csatAvg: record.csatCount > 0 ? record.csatTotal / record.csatCount : null,
      frictionCount: record.frictionCount,
      frictionRate: record.volume > 0 ? record.frictionCount / record.volume : 0,
    });
  }

  return results.sort((a, b) => {
    if (b.volume !== a.volume) return b.volume - a.volume;
    return (a.medianTimeToReply || 0) - (b.medianTimeToReply || 0);
  });
}

/**
 * Calculates the High Friction heuristic P90 threshold dynamically based on the current dataset.
 * If the dataset is too small (< 50), it falls back to 24 hours (86400 seconds).
 */
export function calculateHighFrictionP90(conversations: PulseConversation[]): number {
  if (conversations.length < 50) return 86400; // 24 hours sanity fallback
  
  const handlingTimes = conversations
    .map(c => c.statistics?.handling_time)
    .filter((t): t is number => typeof t === 'number' && t !== null)
    .sort((a, b) => a - b);
    
  if (handlingTimes.length === 0) return 86400;
  
  return calculatePercentile(handlingTimes, 90) || 86400;
}

/**
 * A conversation is flagged High Friction if `count_reopens >= 2` OR `handling_time` exceeds the dataset's p90 handling time.
 */
export function isHighFriction(conv: PulseConversation, p90HandlingTime: number): boolean {
  const reopens = conv.statistics?.count_reopens || 0;
  const handlingTime = conv.statistics?.handling_time || 0;
  
  return reopens >= 2 || handlingTime > p90HandlingTime;
}
export interface IssueStats {
  title: string;
  count: number;
  conversations: PulseConversation[];
}

export function aggregateIssues(conversations: PulseConversation[]): { bugs: IssueStats[], features: IssueStats[], other: IssueStats[], totals: { bugs: number, features: number, other: number } } {
  const bugMap = new Map<string, IssueStats>();
  const featureMap = new Map<string, IssueStats>();
  const otherMap = new Map<string, IssueStats>();
  
  const totals = { bugs: 0, features: 0, other: 0 };

  conversations.forEach(c => {
    const classification = classifyConversation(c.title || '', c.source.body);
    
    const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, '').trim();
    
    let clusterTitle = c.custom_attributes?.['AI Title'] as string;
    
    if (!clusterTitle) {
      const subject = c.source?.subject ? stripHtml(c.source.subject) : '';
      const title = c.title ? stripHtml(c.title) : '';

      if (subject.length > 0 && subject.toLowerCase() !== 'new conversation') {
        clusterTitle = subject;
      } else if (title.length > 0) {
        clusterTitle = title;
      } else {
        if (classification === 'bug') clusterTitle = 'Uncategorized Bugs';
        else if (classification === 'feature_request') clusterTitle = 'Uncategorized Features';
        else clusterTitle = 'General Inquiries';
      }
    }

    if (classification === 'bug') {
      totals.bugs++;
      if (!bugMap.has(clusterTitle)) bugMap.set(clusterTitle, { title: clusterTitle, count: 0, conversations: [] });
      const stat = bugMap.get(clusterTitle)!;
      stat.count += 1;
      stat.conversations.push(c);
    } else if (classification === 'feature_request') {
      totals.features++;
      if (!featureMap.has(clusterTitle)) featureMap.set(clusterTitle, { title: clusterTitle, count: 0, conversations: [] });
      const stat = featureMap.get(clusterTitle)!;
      stat.count += 1;
      stat.conversations.push(c);
    } else {
      totals.other++;
      if (!otherMap.has(clusterTitle)) otherMap.set(clusterTitle, { title: clusterTitle, count: 0, conversations: [] });
      const stat = otherMap.get(clusterTitle)!;
      stat.count += 1;
      stat.conversations.push(c);
    }
  });

  const sortAndSlice = (map: Map<string, IssueStats>) => 
    Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    bugs: sortAndSlice(bugMap),
    features: sortAndSlice(featureMap),
    other: sortAndSlice(otherMap),
    totals
  };
}
