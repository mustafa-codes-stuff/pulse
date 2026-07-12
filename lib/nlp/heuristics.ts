import { stripHtml } from '../utils/string';
import { PulseConversation, ConversationPart } from '../types';

export type TicketClassification = 
  | 'attribute_mismatch'
  | 'auth_access'
  | 'upload_flow'
  | 'payment_checkout'
  | 'other_bugs'
  | 'customization_request'
  | 'core_feature_request'
  | 'refund_request'
  | 'subscription_cancel'
  | 'system_automated'
  | 'general_inquiry';

const SPAM_SYSTEM_REGEX = /\b(business manager|partner request|meta affiliate|privacy rights request|automatic email|no-reply|noreply|auto-reply|auto-response|slack|receipt|welcome to)\b/i;
const REFUND_REGEX = /\b(refund|money back|charge back|chargeback|wrong amount)\b/i;
const CANCEL_REGEX = /\b(cancel|unsubscribe|auto-renew|renew|subscription|billing|invoice|billing cycle)\b/i;
const PAYMENT_REGEX = /\b(order(ed|s)?|purchas(e|ed|ing)|paid|billed|checkout|payment error|failed to pay|declined|credit card|stripe|pay error|checkout screen|billing form|transaction failed|charged twice|charge me again|paid twice|double charge|charged me twice|two charges|second charge|charged monthly|pay again|paid again|charged again|billed again|recharged|took my payment|token(s)?|quota|credit(s)?)\b/i;
const AUTH_REGEX = /\b(login|sign in|verify|verification|password|verify email|email link|sign-in|account access|unauthorized location|not valid link|sign up|create account|invite|join team|delete my account|delete the data|delete my data|delete account|erase pictures|erase photos|remove my data|remove my account)\b/i;
const UPLOAD_REGEX = /\b(upload|uploading|photo upload|file size|unsupported format|image upload|upload error|reference photo|where are my photos|where are my pictures|where can i find|where are the pics|how to access them|access my photos|find my photos|download my photos|see my photos|access them|not downloading|trouble downloading|mobile download|download to my phone|photos are gone|how do i access|receive the pictures|receive the photos)\b/i;

const ATTR_MISMATCH_REGEX = /\b(wrong (hair|color|eye)|hijab|headscarf|different (hair|clothes)|didn't match (my|the) (photo|reference)|wrong face|deformed|disfigured|morphed|extra (finger|limb)|doesn't look like me|didn't look like me|don't look like me|don't look like myself|not realistic|doesn't look realistic|didn't look realistic|non looked realistic|none looked realistic|don't look natural|doesn't look natural|not natural|blurry|fuzzy|pixelated|glitch|grainy|low[- ]resolution|not clear)\b|\b(artifact(s|ing)?)\b/i;
const ATTR_CONTEXT_REGEX = /\b(teeth|eyes|hair|color|clothes|weird|body|deformed|disfigured|quality|not clear|blurry)\b[^]{0,80}?\b(photo|image|render|picture|generation|output)s?\b|\b(photo|image|render|picture|generation|output)s?\b[^]{0,80}?\b(teeth|eyes|hair|color|clothes|weird|body|deformed|disfigured|quality|not clear|blurry)\b/i;

const CUSTOMIZE_REGEX = /\b(change clothing|different background|tie|suit|glasses|smile|hairstyle|backdrop|edit|retouch|unbutton|customize photo|costumize|scar(s)?|turkey neck|cleavage|eye color|skin tone|look fat|look fatter|wrinkle(s)?|neck line(s)?|blemish(es)?|fix my hair|fix my eyes|double chin|fatter|heavier|nose|(redo|rerun)\s+(my\s+|the\s+)?(headshots?|photos?))\b/i;
const FEATURE_REGEX = /\b(would love|please add|not supported|feature|can you add|missing|wish|suggestion|idea|could you add|api|bulk|enterprise|6k|4k|download quality|character)\b/i;
const DELIVERY_PRESALES_REGEX = /\b(how long|where is|not received|pending|waiting|generating|status|ready|when will|duration|turnaround|sample|try before|preview|coupon|discount|price|pricing|cost|package|packages|group discount|before i buy|before purchasing|trial)\b/i;
const BUG_REGEX = /\b(bug|broken|error|crash|crashed|fail|failing|failed|doesn't work|does not work|stuck|glitch|not loading|not working|scroll|button|ui issue|webpage|page|screen)\b/i;

export interface ClassificationResult {
  category: TicketClassification;
  confidence: 'high' | 'low';
  also_relevant_to?: string[];
  cross_tag_reasons?: Record<string, string>;
  is_dual_intent?: boolean;
}

export interface CategoryMatcher {
  category: TicketClassification;
  match: (text: string) => boolean;
}

export const CATEGORY_PRIORITY: CategoryMatcher[] = [
  { category: 'system_automated', match: (t) => SPAM_SYSTEM_REGEX.test(t) },
  { category: 'refund_request', match: (t) => REFUND_REGEX.test(t) },
  { category: 'subscription_cancel', match: (t) => CANCEL_REGEX.test(t) },
  { category: 'payment_checkout', match: (t) => PAYMENT_REGEX.test(t) },
  { category: 'auth_access', match: (t) => AUTH_REGEX.test(t) },
  { category: 'upload_flow', match: (t) => UPLOAD_REGEX.test(t) },
  { category: 'attribute_mismatch', match: (t) => ATTR_MISMATCH_REGEX.test(t) || ATTR_CONTEXT_REGEX.test(t) },
  { category: 'customization_request', match: (t) => CUSTOMIZE_REGEX.test(t) },
  { category: 'core_feature_request', match: (t) => FEATURE_REGEX.test(t) },
  { category: 'other_bugs', match: (t) => BUG_REGEX.test(t) },
  { category: 'general_inquiry', match: (t) => DELIVERY_PRESALES_REGEX.test(t) }
];

const TECH_MALFUNCTION_REGEX = /\b(crash|crashed|bug|glitch|error message|won'?t load|can'?t log in|blank screen|stuck on|failed to (load|process|charge)|freez(e|ing)|frozen|keeps closing|won'?t open|timed out)\b/i;

/**
 * Classify a conversation into one of the specific categories based on heuristics.
 * Returns the category and a confidence score.
 */
export function classifyConversation(conv: PulseConversation): ClassificationResult {
  // If the conversation has been enriched by our LLM pipeline, return that!
  if (conv.llm_classification) {
    return conv.llm_classification as ClassificationResult;
  }

  const partsText = (conv.conversation_parts?.conversation_parts || [])
    .filter((p: ConversationPart) => p.author?.type !== 'admin' && p.body)
    .map((p: ConversationPart) => stripHtml(p.body))
    .join(' ');
  const text = ((conv.title || '') + ' ' + stripHtml(conv.source?.body) + ' ' + partsText).toLowerCase();

  const matchedCategories: TicketClassification[] = [];

  for (const matcher of CATEGORY_PRIORITY) {
    if (matcher.match(text)) {
      matchedCategories.push(matcher.category);
    }
  }

  // Determine category and confidence
  let finalCategory: TicketClassification = 'general_inquiry';
  let finalConfidence: 'high' | 'low' = 'low';

  if (matchedCategories.length > 0) {
    finalCategory = matchedCategories[0];
    finalConfidence = matchedCategories.length === 1 ? 'high' : 'low';
  }

  const result: ClassificationResult = { category: finalCategory, confidence: finalConfidence };

  const supportBillingCategories = ['refund_request', 'subscription_cancel', 'payment_checkout', 'auth_access'];
  if (supportBillingCategories.includes(finalCategory)) {
    const techMatch = text.match(TECH_MALFUNCTION_REGEX);
    if (techMatch) {
      result.also_relevant_to = ['engineering'];
      result.cross_tag_reasons = { ...result.cross_tag_reasons, engineering: techMatch[0].toLowerCase() };
    }
  }

  if (finalCategory === 'refund_request' || finalCategory === 'subscription_cancel') {
    let qualityMatch = null;
    if (ATTR_MISMATCH_REGEX.test(text)) qualityMatch = text.match(ATTR_MISMATCH_REGEX);
    else if (CUSTOMIZE_REGEX.test(text)) qualityMatch = text.match(CUSTOMIZE_REGEX);

    if (qualityMatch) {
      if (!result.also_relevant_to) result.also_relevant_to = [];
      result.also_relevant_to.push('product_quality');
      result.cross_tag_reasons = { ...result.cross_tag_reasons, product_quality: qualityMatch[0].toLowerCase() };
    }
  }

  if (matchedCategories.length > 1 || (result.also_relevant_to && result.also_relevant_to.length > 0)) {
    result.is_dual_intent = true;
  }

  return result;
}

export function generateFallbackTitle(body: string | undefined | null): string {
  if (!body) return 'Untitled Conversation';
  const rawBody = body.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  if (rawBody.length === 0) return 'Untitled Conversation';
  return rawBody.length > 60 ? rawBody.substring(0, 60) + '...' : rawBody;
}
