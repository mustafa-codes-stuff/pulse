import { stripHtml } from './tfidf';
import { PulseConversation } from '../types';

export type TicketClassification = 
  | 'image_quality_technical'
  | 'generation_accuracy'
  | 'attribute_mismatch'
  | 'auth_access'
  | 'upload_flow'
  | 'payment_checkout'
  | 'other_bugs'
  | 'customization_request'
  | 'core_feature_request'
  | 'refund_request'
  | 'subscription_cancel'
  | 'pre_sales_info'
  | 'delivery_status'
  | 'system_automated'
  | 'general_inquiry'
  | 'double_charge_payment'
  | 'access_delivered_photos'
  | 'specific_retouching'
  | 'account_deletion'
  | 'credits_quotas';

const SPAM_SYSTEM_REGEX = /\b(business manager|partner request|meta affiliate|privacy rights request|automatic email|no-reply|noreply|auto-reply|auto-response|slack|receipt|welcome to)\b/i;
const REFUND_REGEX = /\b(refund|money back|charge back|chargeback|wrong amount)\b/i;
const CANCEL_REGEX = /\b(cancel|unsubscribe|auto-renew|renew|subscription|billing|invoice|billing cycle)\b/i;
const PAYMENT_REGEX = /\b(order(ed|s)?|purchas(e|ed|ing)|paid|billed|checkout|payment error|failed to pay|declined|credit card|stripe|pay error|checkout screen|billing form|transaction failed)\b/i;
const DOUBLE_CHARGE_REGEX = /\b(charged twice|charge me again|paid twice|double charge|charged me twice|two charges|second charge|charged monthly|pay again|paid again|charged again|billed again|recharged|took my payment)\b/i;
const AUTH_REGEX = /\b(login|sign in|verify|verification|password|verify email|email link|sign-in|account access|unauthorized location|not valid link|sign up|create account|invite|join team)\b/i;
const ACCESS_PHOTOS_REGEX = /\b(where are my photos|where are my pictures|where can i find|where are the pics|how to access them|access my photos|find my photos|download my photos|see my photos|access them|not downloading|trouble downloading|mobile download|download to my phone|photos are gone|how do i access|receive the pictures|receive the photos)\b/i;
const UPLOAD_REGEX = /\b(upload|uploading|photo upload|file size|unsupported format|image upload|upload error|reference photo)\b/i;

// Split rendering quality technical, accuracy, and styling attributes
const IMAGE_QUALITY_TECH_REGEX = /\b(blurry|fuzzy|pixelated|glitch|grainy|low.resolution|not clear)\b|\b(artifact(s|ing)?)\b/i;
const GEN_ACCURACY_REGEX = /\b(wrong face|deformed|disfigured|morphed|extra (finger|limb)|doesn't look like me|didn't look like me|don't look like me|don't look like myself|not realistic|doesn't look realistic|didn't look realistic|non looked realistic|none looked realistic|don't look natural|doesn't look natural|not natural)\b/i;
const ATTR_MISMATCH_REGEX = /\b(wrong (hair|color|eye)|hijab|headscarf|different (hair|clothes)|didn't match (my|the) (photo|reference))\b/i;

// Contextual fallback checks to avoid generic false-positives
const QUALITY_CONTEXT_REGEX = /\b(quality|not clear|blurry)\b[^]{0,80}?\b(photo|image|render|picture|generation|output)s?\b|\b(photo|image|render|picture|generation|output)s?\b[^]{0,80}?\b(quality|not clear|blurry)\b/i;
const WEIRD_CONTEXT_REGEX = /\b(weird|body|deformed|disfigured)\b[^]{0,80}?\b(photo|image|render|picture|generation|output)s?\b|\b(photo|image|render|picture|generation|output)s?\b[^]{0,80}?\b(weird|body|deformed|disfigured)\b/i;
const ATTR_CONTEXT_REGEX = /\b(teeth|eyes|hair|color|clothes)\b[^]{0,80}?\b(photo|image|render|picture|generation|output)s?\b|\b(photo|image|render|picture|generation|output)s?\b[^]{0,80}?\b(teeth|eyes|hair|color|clothes)\b/i;

const CUSTOMIZE_REGEX = /\b(change clothing|different background|tie|suit|glasses|smile|hairstyle|backdrop|edit|retouch|unbutton|customize photo|costumize)\b/i;
const SPECIFIC_RETOUCH_REGEX = /\b(scar(s)?|turkey neck|cleavage|eye color|skin tone|look fat|look fatter|wrinkle(s)?|neck line(s)?|blemish(es)?|fix my hair|fix my eyes|double chin|fatter|heavier|nose|(redo|rerun)\s+(my\s+|the\s+)?(headshots?|photos?))\b/i;
const FEATURE_REGEX = /\b(would love|please add|not supported|feature|can you add|missing|wish|suggestion|idea|could you add|api|bulk|enterprise|6k|4k|download quality|character)\b/i;
const PRESALES_REGEX = /\b(sample|try before|preview|coupon|discount|price|pricing|cost|package|packages|group discount|before i buy|before purchasing|trial)\b/i;
const DELIVERY_REGEX = /\b(how long|where is|not received|pending|waiting|generating|status|ready|when will|duration|turnaround)\b/i;
const BUG_REGEX = /\b(bug|broken|error|crash|crashed|fail|failing|failed|doesn't work|does not work|stuck|glitch|not loading|not working|scroll|button|ui issue|webpage|page|screen)\b/i;

const PRIVACY_REGEX = /\b(delete my account|delete the data|delete my data|delete account|erase pictures|erase photos|remove my data|remove my account)\b/i;
const CREDITS_REGEX = /\b(token(s)?|quota|credit(s)?)\b(?!\s*card)/i;

export interface ClassificationResult {
  category: TicketClassification;
  confidence: 'high' | 'low';
  also_relevant_to?: string[];
  cross_tag_reason?: string;
}

const TECH_MALFUNCTION_REGEX = /\b(crash|crashed|bug|glitch|error message|won'?t load|can'?t log in|blank screen|stuck on|failed to (load|process|charge)|freez(e|ing)|frozen|keeps closing|won'?t open|timed out)\b/i;

/**
 * Classify a conversation into one of the specific categories based on heuristics.
 * Returns the category and a confidence score.
 */
export function classifyConversation(conv: PulseConversation): ClassificationResult {
  const partsText = (conv.conversation_parts?.conversation_parts || [])
    .filter((p: any) => p.author?.type !== 'admin' && p.body)
    .map((p: any) => stripHtml(p.body))
    .join(' ');
  const text = ((conv.title || '') + ' ' + stripHtml(conv.source?.body) + ' ' + partsText).toLowerCase();

  const matchedCategories: TicketClassification[] = [];

  if (SPAM_SYSTEM_REGEX.test(text)) matchedCategories.push('system_automated');
  if (REFUND_REGEX.test(text)) matchedCategories.push('refund_request');
  if (CANCEL_REGEX.test(text)) matchedCategories.push('subscription_cancel');
  if (PAYMENT_REGEX.test(text)) matchedCategories.push('payment_checkout');
  if (DOUBLE_CHARGE_REGEX.test(text)) matchedCategories.push('double_charge_payment');
  if (AUTH_REGEX.test(text)) matchedCategories.push('auth_access');
  if (ACCESS_PHOTOS_REGEX.test(text)) matchedCategories.push('access_delivered_photos');
  if (UPLOAD_REGEX.test(text)) matchedCategories.push('upload_flow');
  
  if (IMAGE_QUALITY_TECH_REGEX.test(text) || QUALITY_CONTEXT_REGEX.test(text)) matchedCategories.push('image_quality_technical');
  if (GEN_ACCURACY_REGEX.test(text) || WEIRD_CONTEXT_REGEX.test(text)) matchedCategories.push('generation_accuracy');
  if (ATTR_MISMATCH_REGEX.test(text) || ATTR_CONTEXT_REGEX.test(text)) matchedCategories.push('attribute_mismatch');

  if (CUSTOMIZE_REGEX.test(text)) matchedCategories.push('customization_request');
  if (SPECIFIC_RETOUCH_REGEX.test(text)) matchedCategories.push('specific_retouching');
  if (FEATURE_REGEX.test(text)) matchedCategories.push('core_feature_request');
  if (DELIVERY_REGEX.test(text)) matchedCategories.push('delivery_status');
  if (PRESALES_REGEX.test(text)) matchedCategories.push('pre_sales_info');
  if (BUG_REGEX.test(text)) matchedCategories.push('other_bugs');
  if (PRIVACY_REGEX.test(text)) matchedCategories.push('account_deletion');
  if (CREDITS_REGEX.test(text)) matchedCategories.push('credits_quotas');

  // Determine category and confidence
  let finalCategory: TicketClassification = 'general_inquiry';
  let finalConfidence: 'high' | 'low' = 'low';

  if (matchedCategories.length > 0) {
    finalCategory = matchedCategories[0];
    finalConfidence = matchedCategories.length === 1 ? 'high' : 'low';
  }

  const result: ClassificationResult = { category: finalCategory, confidence: finalConfidence };

  const supportBillingCategories = ['refund_request', 'subscription_cancel', 'payment_checkout', 'double_charge_payment', 'credits_quotas', 'account_deletion'];
  if (supportBillingCategories.includes(finalCategory)) {
    const techMatch = text.match(TECH_MALFUNCTION_REGEX);
    if (techMatch) {
      result.also_relevant_to = ['engineering'];
      result.cross_tag_reason = techMatch[0].toLowerCase();
    }
  }

  if (finalCategory === 'refund_request' || finalCategory === 'subscription_cancel') {
    let qualityMatch = null;
    if (SPECIFIC_RETOUCH_REGEX.test(text)) qualityMatch = text.match(SPECIFIC_RETOUCH_REGEX);
    else if (GEN_ACCURACY_REGEX.test(text)) qualityMatch = text.match(GEN_ACCURACY_REGEX);
    else if (ATTR_MISMATCH_REGEX.test(text)) qualityMatch = text.match(ATTR_MISMATCH_REGEX);

    if (qualityMatch) {
      if (!result.also_relevant_to) result.also_relevant_to = [];
      result.also_relevant_to.push('product_quality');
      result.cross_tag_reason = qualityMatch[0].toLowerCase();
    }
  }

  return result;
}


export function generateFallbackTitle(body: string | undefined | null): string {
  if (!body) return 'Untitled Conversation';
  const rawBody = body.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  if (rawBody.length === 0) return 'Untitled Conversation';
  return rawBody.length > 60 ? rawBody.substring(0, 60) + '...' : rawBody;
}
