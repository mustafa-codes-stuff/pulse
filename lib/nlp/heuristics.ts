import { stripHtml } from './tfidf';

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
  | 'system_automated';

const SPAM_SYSTEM_REGEX = /\b(business manager|partner request|meta affiliate|privacy rights request|automatic email|no-reply|noreply|auto-reply|auto-response|slack|receipt|welcome to)\b/i;
const REFUND_REGEX = /\b(refund|money back|charge back|chargeback|double charge|charged me|wrong amount)\b/i;
const CANCEL_REGEX = /\b(cancel|unsubscribe|auto-renew|renew|subscription|billing|invoice|billing cycle)\b/i;
const PAYMENT_REGEX = /\b(checkout|payment error|failed to pay|declined|credit card|stripe|pay error|checkout screen|billing form|transaction failed)\b/i;
const AUTH_REGEX = /\b(login|sign in|verify|verification|password|verify email|email link|sign-in|account access|unauthorized location|not valid link|sign up|create account)\b/i;
const UPLOAD_REGEX = /\b(upload|uploading|photo upload|file size|unsupported format|image upload|upload error|reference photo)\b/i;

// Split rendering quality technical, accuracy, and styling attributes
const IMAGE_QUALITY_TECH_REGEX = /\b(blurry|fuzzy|pixelated|glitch|grainy|low.resolution|not clear)\b|\b(artifact(s|ing)?)\b/i;
const GEN_ACCURACY_REGEX = /\b(wrong face|deformed|disfigured|extra (finger|limb)|doesn't look like me|didn't look like me)\b/i;
const ATTR_MISMATCH_REGEX = /\b(wrong (hair|color|eye)|hijab|headscarf|different (hair|clothes)|didn't match (my|the) (photo|reference))\b/i;

// Contextual fallback checks to avoid generic false-positives
const QUALITY_CONTEXT_REGEX = /\b(quality|not clear|blurry)\b.*\b(photo|image|render|picture|generation|output)\b|\b(photo|image|render|picture|generation|output)\b.*\b(quality|not clear|blurry)\b/i;
const WEIRD_CONTEXT_REGEX = /\b(weird|body|deformed|disfigured)\b.*\b(photo|image|render|picture|generation|output)\b|\b(photo|image|render|picture|generation|output)\b.*\b(weird|body|deformed|disfigured)\b/i;
const ATTR_CONTEXT_REGEX = /\b(teeth|eyes|hair|color|clothes)\b.*\b(photo|image|render|picture|generation|output)\b|\b(photo|image|render|picture|generation|output)\b.*\b(teeth|eyes|hair|color|clothes)\b/i;

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
 * Classify a conversation into one of the specific categories based on heuristics.
 * Returns the category and a confidence score.
 */
export function classifyConversation(title: string, body: string | null | undefined): ClassificationResult {
  const text = ((title || '') + ' ' + stripHtml(body)).toLowerCase();

  const matchedCategories: TicketClassification[] = [];

  if (SPAM_SYSTEM_REGEX.test(text)) matchedCategories.push('system_automated');
  if (REFUND_REGEX.test(text)) matchedCategories.push('refund_request');
  if (CANCEL_REGEX.test(text)) matchedCategories.push('subscription_cancel');
  if (PAYMENT_REGEX.test(text)) matchedCategories.push('payment_checkout');
  if (AUTH_REGEX.test(text)) matchedCategories.push('auth_access');
  if (UPLOAD_REGEX.test(text)) matchedCategories.push('upload_flow');
  
  if (IMAGE_QUALITY_TECH_REGEX.test(text) || QUALITY_CONTEXT_REGEX.test(text)) matchedCategories.push('image_quality_technical');
  if (GEN_ACCURACY_REGEX.test(text) || WEIRD_CONTEXT_REGEX.test(text)) matchedCategories.push('generation_accuracy');
  if (ATTR_MISMATCH_REGEX.test(text) || ATTR_CONTEXT_REGEX.test(text)) matchedCategories.push('attribute_mismatch');

  if (CUSTOMIZE_REGEX.test(text)) matchedCategories.push('customization_request');
  if (FEATURE_REGEX.test(text)) matchedCategories.push('core_feature_request');
  if (DELIVERY_REGEX.test(text)) matchedCategories.push('delivery_status');
  if (PRESALES_REGEX.test(text)) matchedCategories.push('pre_sales_info');
  if (BUG_REGEX.test(text)) matchedCategories.push('other_bugs');

  // Determine category and confidence
  if (matchedCategories.length > 0) {
    const firstMatch = matchedCategories[0];
    const confidence = matchedCategories.length === 1 ? 'high' : 'low';
    return { category: firstMatch, confidence };
  }

  // Fallbacks
  if (text.includes('redo') || text.includes('photo') || text.includes('shot')) {
    return { category: 'image_quality_technical', confidence: 'low' };
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
