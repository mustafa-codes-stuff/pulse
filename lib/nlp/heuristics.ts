import { stripHtml } from './tfidf';

export type TicketClassification = 
  | 'rendering_quality'
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
  | 'system_automated';

const SPAM_SYSTEM_REGEX = /\b(business manager|partner request|meta affiliate|privacy rights request|automatic email|no-reply|noreply|auto-reply|auto-response|slack|receipt|welcome to)\b/i;
const REFUND_REGEX = /\b(refund|money back|charge back|chargeback|double charge|charged me|wrong amount)\b/i;
const CANCEL_REGEX = /\b(cancel|unsubscribe|auto-renew|renew|subscription|billing|invoice|billing cycle)\b/i;
const PAYMENT_REGEX = /\b(checkout|payment error|failed to pay|declined|credit card|stripe|pay error|checkout screen|billing form|transaction failed)\b/i;
const AUTH_REGEX = /\b(login|sign in|verify|verification|password|verify email|email link|sign-in|account access|unauthorized location|not valid link|sign up|create account)\b/i;
const UPLOAD_REGEX = /\b(upload|uploading|photo upload|file size|unsupported format|image upload|upload error|reference photo)\b/i;
const RENDER_REGEX = /\b(hair|color|blurry|rendering|glitch|artifact|disfigured|teeth|eyes|deformed|weird|wrong face|body|clothes|hijab|headscarf|quality|not clear|fuzzy)\b/i;
const CUSTOMIZE_REGEX = /\b(change clothing|different background|tie|suit|glasses|smile|hairstyle|backdrop|edit|retouch|unbutton|customize photo|costumize)\b/i;
const FEATURE_REGEX = /\b(would love|please add|not supported|feature|can you add|missing|wish|suggestion|idea|could you add|api|bulk|enterprise|6k|4k|download quality|character|credits)\b/i;
const PRESALES_REGEX = /\b(sample|try before|preview|coupon|discount|price|pricing|cost|package|packages|group discount|before i buy|before purchasing)\b/i;
const DELIVERY_REGEX = /\b(how long|where is|not received|pending|waiting|generating|status|ready|when will|duration|turnaround)\b/i;
const BUG_REGEX = /\b(bug|broken|error|crash|fail|failing|failed|doesn't work|does not work|stuck|glitch|not loading|not working)\b/i;

export interface ClassificationResult {
  category: TicketClassification;
  confidence: 'high' | 'low';
}

/**
 * Classify a conversation into one of the 12 specific categories based on heuristics.
 * Returns the category and a confidence score.
 */
export function classifyConversation(title: string, body: string | null | undefined): ClassificationResult {
  const text = ((title || '') + ' ' + stripHtml(body)).toLowerCase();

  const matches = [
    { cat: 'system_automated' as TicketClassification, regex: SPAM_SYSTEM_REGEX },
    { cat: 'refund_request' as TicketClassification, regex: REFUND_REGEX },
    { cat: 'subscription_cancel' as TicketClassification, regex: CANCEL_REGEX },
    { cat: 'payment_checkout' as TicketClassification, regex: PAYMENT_REGEX },
    { cat: 'auth_access' as TicketClassification, regex: AUTH_REGEX },
    { cat: 'upload_flow' as TicketClassification, regex: UPLOAD_REGEX },
    { cat: 'rendering_quality' as TicketClassification, regex: RENDER_REGEX },
    { cat: 'customization_request' as TicketClassification, regex: CUSTOMIZE_REGEX },
    { cat: 'core_feature_request' as TicketClassification, regex: FEATURE_REGEX },
    { cat: 'delivery_status' as TicketClassification, regex: DELIVERY_REGEX },
    { cat: 'pre_sales_info' as TicketClassification, regex: PRESALES_REGEX },
    { cat: 'other_bugs' as TicketClassification, regex: BUG_REGEX }
  ];

  let matchedCategories: TicketClassification[] = [];
  let firstMatch: TicketClassification | null = null;

  for (const match of matches) {
    if (match.regex.test(text)) {
      matchedCategories.push(match.cat);
      if (!firstMatch) {
        firstMatch = match.cat;
      }
    }
  }

  // High confidence: exactly one specific regex matched, or refund/auth matched (very specific)
  // Low confidence: multiple matched, or fallback used
  if (firstMatch) {
    const isHighlySpecific = firstMatch === 'refund_request' || firstMatch === 'auth_access';
    const confidence = (matchedCategories.length === 1 || isHighlySpecific) ? 'high' : 'low';
    return { category: firstMatch, confidence };
  }

  // Fallbacks
  if (text.includes('redo') || text.includes('photo') || text.includes('shot')) {
    return { category: 'rendering_quality', confidence: 'low' };
  }
  
  return { category: 'pre_sales_info', confidence: 'low' }; // Default category for general questions/pre-sales
}

/**
 * Check if the conversation references images or attachments.
 */
export function hasAttachmentReferences(body: string | null | undefined): boolean {
  if (!body) return false;
  const lowerBody = body.toLowerCase();
  
  return (
    lowerBody.includes('<img') || 
    lowerBody.includes('attachment') || 
    lowerBody.includes('attached') ||
    lowerBody.includes('.png') ||
    lowerBody.includes('.jpg') ||
    lowerBody.includes('.jpeg') ||
    lowerBody.includes('.pdf')
  );
}

export function generateFallbackTitle(body: string | undefined | null): string {
  if (!body) return 'Untitled Conversation';
  const rawBody = body.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  if (rawBody.length === 0) return 'Untitled Conversation';
  return rawBody.length > 60 ? rawBody.substring(0, 60) + '...' : rawBody;
}
