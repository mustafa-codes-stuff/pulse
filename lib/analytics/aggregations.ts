import { PulseConversation } from '../types';
import { classifyConversation } from '../nlp/heuristics';
import { calculatePercentile } from './stats';
import { formatPT } from '../utils/timezone';

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
    const dateStr = formatPT(conv.created_at, 'yyyy-MM-dd');
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
  medianTimeToAdminReply: number | null;
  avgTurns: number | null;
  csatTotal: number;
  csatCount: number;
  csatAvg: number | null;
  frictionCount: number;
  frictionRate: number;
  reopenCount: number;
  reopenRate: number;
}

export function aggregateAgentPerformance(conversations: PulseConversation[]): AgentMetrics[] {
  const map = new Map<string, { name: string; replies: number[]; turnsTotal: number; turnsCount: number; volume: number; csatTotal: number; csatCount: number; frictionCount: number; reopenCount: number }>();
  
  const thresholds = computeDatasetThresholds(conversations);

  for (const conv of conversations) {
    const adminParts = conv.conversation_parts?.conversation_parts?.filter(p => p.author?.type === 'admin') || [];
    if (adminParts.length === 0) continue;
    
    const lastAdminPart = adminParts[adminParts.length - 1];
    const agentName = lastAdminPart.author?.name || 'Unknown Agent';
    const agentId = String(lastAdminPart.author?.id || 'unknown');

    if (!map.has(agentId)) {
      map.set(agentId, { name: agentName, replies: [], turnsTotal: 0, turnsCount: 0, volume: 0, csatTotal: 0, csatCount: 0, frictionCount: 0, reopenCount: 0 });
    }
    const record = map.get(agentId)!;
    
    record.volume += 1;
    const parts = conv.conversation_parts?.conversation_parts || [];
    record.turnsTotal += parts.filter(p => p.part_type === 'comment').length;
    record.turnsCount += 1;

    if (conv.statistics?.time_to_admin_reply != null) {
      record.replies.push(conv.statistics.time_to_admin_reply);
    }
    
    if (conv.conversation_rating?.rating) {
      record.csatTotal += conv.conversation_rating.rating;
      record.csatCount += 1;
    }
    
    if (computeEscalationRisk(conv, thresholds) > 0.5) {
      record.frictionCount += 1;
    }
    
    if ((conv.statistics?.count_reopens || 0) > 0) {
      record.reopenCount += 1;
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
      medianTimeToAdminReply: median,
      avgTurns: record.turnsCount > 0 ? record.turnsTotal / record.turnsCount : null,
      csatTotal: record.csatTotal,
      csatCount: record.csatCount,
      csatAvg: record.csatCount > 0 ? record.csatTotal / record.csatCount : null,
      frictionCount: record.frictionCount,
      frictionRate: record.volume > 0 ? record.frictionCount / record.volume : 0,
      reopenCount: record.reopenCount,
      reopenRate: record.volume > 0 ? record.reopenCount / record.volume : 0,
    });
  }

  return results.sort((a, b) => {
    if (b.volume !== a.volume) return b.volume - a.volume;
    return (a.medianTimeToAdminReply || 0) - (b.medianTimeToAdminReply || 0);
  });
}

export interface EscalationThresholds {
  handlingTimeP90: number;
  backAndForthP90: number;
  responseTimeP90: number;
}

export function computeDatasetThresholds(conversations: PulseConversation[]): EscalationThresholds {
  const handlingTimes = conversations
    .map(c => c.statistics?.handling_time)
    .filter((t): t is number => typeof t === 'number' && t !== null)
    .sort((a, b) => a - b);
  const handlingTimeP90 = handlingTimes.length > 0 ? (calculatePercentile(handlingTimes, 90) || 86400) : 86400;

  const bnfCounts = conversations.map(c => {
    const parts = c.conversation_parts?.conversation_parts || [];
    return parts.filter(p => p.part_type === 'comment').length;
  }).sort((a, b) => a - b);
  const backAndForthP90 = bnfCounts.length > 0 ? (calculatePercentile(bnfCounts, 90) || 15) : 15;

  const responseTimes = conversations
    .map(c => c.statistics?.time_to_admin_reply)
    .filter((t): t is number => typeof t === 'number' && t !== null)
    .sort((a, b) => a - b);
  const responseTimeP90 = responseTimes.length > 0 ? (calculatePercentile(responseTimes, 90) || 14400) : 14400;

  return { handlingTimeP90, backAndForthP90, responseTimeP90 };
}

export const FRUSTRATION_PATTERNS_DIRECT = [
  /\bfrustrat/i, /\bdisappoint/i, /\bunacceptable/i, /\bridiculous/i,
  /\bas i said/i, /\bstill not/i, /\bdidn't answer/i, /\balready told/i,
  /\bnot (what|how) i/i, /\bwaste of/i,
  /\bhorrible/i, /\bterrible/i, /\bawful/i, /\bfurious/i,
  /\bscam/i, /\brip.?off/i, /\bnever again/i, /\bworst/i,
  /\bstill waiting/i, /\bno response/i
];

export const FRUSTRATION_PATTERNS_CONTEXTUAL = [
  { pattern: /\brefund/i, guard: /(angry|frustrat|ridiculous|unacceptable|scam|rip.?off|horrible|terrible|awful|furious|worst|!)/i },
  { pattern: /\bmanager/i, guard: /(complain|unacceptable|ridiculous|frustrat|angry|horrible|terrible|awful|furious|worst|!)/i },
  { pattern: /\bsupervisor/i, guard: /(complain|unacceptable|ridiculous|frustrat|angry|horrible|terrible|awful|furious|worst|!)/i },
  { pattern: /\bescalat/i, guard: /(want to|need to|going to)/i },
  { pattern: /\bignor/i, guard: /(you|being|are)/i }
];

export function hasFrustrationPattern(body: string): { hasFrustration: boolean, matchedPattern?: string } {
  for (const pat of FRUSTRATION_PATTERNS_DIRECT) {
    if (pat.test(body)) return { hasFrustration: true, matchedPattern: pat.source };
  }
  for (const { pattern, guard } of FRUSTRATION_PATTERNS_CONTEXTUAL) {
    if (pattern.test(body) && guard.test(body)) return { hasFrustration: true, matchedPattern: pattern.source };
  }
  return { hasFrustration: false };
}

export function getVisibleParts(conv: PulseConversation) {
  const allParts = [
    {
      id: 'initial_message',
      type: 'initial',
      body: conv.source?.body || '',
      created_at: conv.created_at,
      author: conv.source?.author,
    },
    ...(conv.conversation_parts?.conversation_parts || []).map(p => ({
      id: p.id,
      type: p.part_type,
      body: p.body,
      created_at: p.created_at,
      author: p.author,
    }))
  ];

  return allParts
    .filter(p => p.type === 'initial' || p.type === 'comment' || p.type === 'note')
    .sort((a, b) => a.created_at - b.created_at);
}

export function getFrustratedParts(conv: PulseConversation): Set<string> {
  const flagged = new Set<string>();
  const visibleParts = getVisibleParts(conv);

  for (let i = 0; i < visibleParts.length; i++) {
    const p = visibleParts[i];
    if (p.author?.type === 'user' || p.author?.type === 'lead') {
      const body = (p.body || '').replace(/<[^>]*>?/gm, ' ');
      if (hasFrustrationPattern(body).hasFrustration) {
        flagged.add(p.id);
        
        // Also flag the immediately preceding admin message to show context
        for (let j = i - 1; j >= 0; j--) {
          if (visibleParts[j].author?.type === 'admin') {
            flagged.add(visibleParts[j].id);
            break;
          }
        }
      }
    }
  }

  return flagged;
}

export function hasConversationFrustration(conv: PulseConversation): boolean {
  return getFrustratedParts(conv).size > 0;
}

export function computeEscalationRisk(
  conv: PulseConversation,
  thresholds: EscalationThresholds
): number {
  let risk = 0;
  
  // 1. Reopens (weight 2x) - strongest validated signal
  const reopens = conv.statistics?.count_reopens || 0;
  if (reopens >= 2) risk += 0.4;
  else if (reopens === 1) risk += 0.2;

  // 2. Handling Time
  const handlingTime = conv.statistics?.handling_time || 0;
  if (handlingTime > thresholds.handlingTimeP90) risk += 0.2;

  // 3. Back-and-forth
  const parts = conv.conversation_parts?.conversation_parts || [];
  const comments = parts.filter(p => p.part_type === 'comment').length;
  if (comments > thresholds.backAndForthP90) risk += 0.2;

  // 4. Frustration (per conversation)
  if (hasConversationFrustration(conv)) risk += 0.2;

  return Math.min(risk, 1.0);
}

export interface FrustrationPair {
  conversation: PulseConversation;
  agentPartId: string;
  agentName: string;
  agentReplySnippet: string;
  customerPartId: string;
  customerReplySnippet: string;
  frustrationPattern: string;
}

export function extractFrustrationPairs(conversations: PulseConversation[]): FrustrationPair[] {
  const pairs: FrustrationPair[] = [];

  for (const conv of conversations) {
    const parts = conv.conversation_parts?.conversation_parts || [];
    
    // Iterate to find frustrated customer replies
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].author?.type === 'user' || parts[i].author?.type === 'lead') {
        const customerBody = (parts[i].body || '').replace(/<[^>]*>?/gm, ' ');
        const { hasFrustration, matchedPattern } = hasFrustrationPattern(customerBody);
        
        if (hasFrustration) {
          // Find the closest preceding admin reply that is an actual message to the customer
          let adminPart = null;
          for (let j = i - 1; j >= 0; j--) {
            if (parts[j].author?.type === 'admin' && parts[j].part_type === 'comment') {
              adminPart = parts[j];
              break;
            }
          }
          
          if (adminPart) {
            const agentBody = (adminPart.body || '').replace(/<[^>]*>?/gm, ' ');
            pairs.push({
              conversation: conv,
              agentPartId: adminPart.id,
              agentName: adminPart.author?.name || 'Unknown Agent',
              agentReplySnippet: agentBody.length > 120 ? agentBody.substring(0, 120) + '...' : agentBody,
              customerPartId: parts[i].id,
              customerReplySnippet: customerBody.length > 120 ? customerBody.substring(0, 120) + '...' : customerBody,
              frustrationPattern: matchedPattern || 'unknown'
            });
          }
        }
      }
    }
  }

  return pairs.sort((a, b) => b.conversation.created_at - a.conversation.created_at);
}
export const CATEGORY_FRIENDLY_NAMES: Record<string, string> = {
  image_quality_technical: 'Image Quality (Technical)',
  generation_accuracy: 'AI Generation Accuracy',
  attribute_mismatch: 'Styling & Attribute Mismatch',
  auth_access: 'Login & Account Access',
  upload_flow: 'Photo Upload Issues',
  payment_checkout: 'Payment & Checkout Failures',
  customization_request: 'Customization Requests',
  core_feature_request: 'Core Features & Formats',
  other_bugs: 'General Bugs & UI Issues',
  refund_request: 'Refund Requests',
  subscription_cancel: 'Subscriptions & Cancellations',
  pre_sales_info: 'Pre-sales & Pricing Info',
  delivery_status: 'Delivery Status & ETAs',
  system_automated: 'Automated System Spam',
  general_inquiry: 'General Inquiries & Unclassified',
  double_charge_payment: 'Double Charging & Payment Confusion',
  access_delivered_photos: 'Accessing Delivered Photos',
  specific_retouching: 'Specific Retouching & Edits',
  account_deletion: 'Account Deletion & Privacy',
  credits_quotas: 'Credits & Quotas',
  cross_tagged_engineering: 'Also Flagged from Support',
  cross_tagged_product_quality: 'Likeness & Quality Flags',
};

export interface CategoryPainMetrics {
  title: string;
  category: string;
  count: number;
  uniqueCustomers: number;
  averageCsat: number | null;
  reopenRate: number;
  painIndex: number;
  lowConfidenceCount: number;
  conversations: PulseConversation[];
}

function calculateCategoryMetrics(
  category: string, 
  convs: PulseConversation[], 
  thresholds: EscalationThresholds
): CategoryPainMetrics {
  const count = convs.length;
  const emails = convs.map(c => c.source?.author?.email || c.source?.author?.name || c.id);
  const uniqueCustomers = new Set(emails).size;

  if (count === 0) {
    return {
      title: CATEGORY_FRIENDLY_NAMES[category] || category,
      category,
      count: 0,
      uniqueCustomers: 0,
      averageCsat: null,
      reopenRate: 0,
      painIndex: 0,
      lowConfidenceCount: 0,
      conversations: []
    };
  }

  // 1. Churn Exposure (Volume) - capped at 25 unique customers representing max exposure
  const churnExposure = Math.min(uniqueCustomers / 25, 1.0);

  // 2. Support Burden (Escalation Risk) - average escalation risk
  let totalEscalationRisk = 0;
  let reopenedCount = 0;
  let csatSum = 0;
  let csatCount = 0;
  let lowConfidenceCount = 0;

  convs.forEach(c => {
    const { confidence } = classifyConversation(c);
    if (confidence === 'low') lowConfidenceCount++;
    
    totalEscalationRisk += computeEscalationRisk(c, thresholds);
    if (c.statistics?.count_reopens > 0) {
      reopenedCount++;
    }
    if (c.conversation_rating?.rating) {
      csatSum += c.conversation_rating.rating;
      csatCount++;
    }
  });

  const supportBurden = totalEscalationRisk / count;

  // 3. Sentiment Damage (CSAT) - scale 1-5 to 0-1 (low score is higher damage)
  const averageCsat = csatCount > 0 ? csatSum / csatCount : null;
  const sentimentDamage = averageCsat !== null ? (5 - averageCsat) / 4 : 0.2; // 0.2 is neutral/default

  // 4. First-Fix Failure Rate (Reopens)
  const firstFixFailureRate = reopenedCount / count;

  // Compute Pain Index (0 - 100)
  // Weights: Churn Exposure 30%, Support Burden 30%, Sentiment Damage 20%, First-Fix Failure Rate 20%
  const score = (churnExposure * 0.3) + (supportBurden * 0.3) + (sentimentDamage * 0.2) + (firstFixFailureRate * 0.2);
  const painIndex = Math.round(score * 100);

  return {
    title: CATEGORY_FRIENDLY_NAMES[category] || category,
    category,
    count,
    uniqueCustomers,
    averageCsat,
    reopenRate: firstFixFailureRate,
    painIndex,
    lowConfidenceCount,
    conversations: convs
  };
}

export function aggregateIssues(conversations: PulseConversation[]): { 
  bugs: CategoryPainMetrics[], 
  features: CategoryPainMetrics[], 
  billing: CategoryPainMetrics[],
  sales: CategoryPainMetrics[],
  other: CategoryPainMetrics[], 
  totals: { bugs: number, features: number, billing: number, sales: number, other: number } 
} {
  const totals = { bugs: 0, features: 0, billing: 0, sales: 0, other: 0 };
  const thresholds = computeDatasetThresholds(conversations);

  // Split rendering quality category
  const bugCategories = ['image_quality_technical', 'generation_accuracy', 'attribute_mismatch', 'upload_flow', 'other_bugs', 'cross_tagged_engineering'];
  const featureCategories = ['customization_request', 'specific_retouching', 'core_feature_request'];
  const billingCategories = ['payment_checkout', 'double_charge_payment', 'refund_request', 'subscription_cancel', 'auth_access', 'account_deletion', 'credits_quotas'];
  const salesCategories = ['pre_sales_info', 'delivery_status', 'access_delivered_photos'];
  const otherCategories = ['general_inquiry']; // Exclude system_automated from dashboard lists

  // Initialize maps
  const groups: Record<string, PulseConversation[]> = {};
  const allCategories = [...bugCategories, ...featureCategories, ...billingCategories, ...salesCategories, ...otherCategories, 'system_automated', 'cross_tagged_product_quality'];
  allCategories.forEach(cat => groups[cat] = []);

  conversations.forEach(c => {
    const { category: classification, also_relevant_to } = classifyConversation(c);
    
    if (also_relevant_to?.includes('product_quality')) {
      groups['cross_tagged_product_quality'].push(c);
    }
    
    if (groups[classification]) {
      groups[classification].push(c);
    } else {
      // Fallback in case of unexpected string
      if (groups['general_inquiry']) {
        groups['general_inquiry'].push(c);
      }
    }

    if (also_relevant_to?.includes('engineering')) {
      groups['cross_tagged_engineering'].push(c);
    }

    if (bugCategories.includes(classification)) {
      totals.bugs++;
    } else if (featureCategories.includes(classification)) {
      totals.features++;
    } else if (billingCategories.includes(classification)) {
      totals.billing++;
    } else if (salesCategories.includes(classification)) {
      totals.sales++;
    } else if (classification !== 'system_automated') {
      totals.other++;
    }
  });

  const sortAndFilter = (cats: string[]) => {
    return cats
      .map(cat => calculateCategoryMetrics(cat, groups[cat] || [], thresholds))
      .filter(metrics => metrics.count > 0)
      .sort((a, b) => b.painIndex - a.painIndex);
  };

  return {
    bugs: sortAndFilter(bugCategories),
    features: sortAndFilter(featureCategories),
    billing: sortAndFilter(billingCategories),
    sales: sortAndFilter(salesCategories),
    other: sortAndFilter(otherCategories),
    totals
  };
}
