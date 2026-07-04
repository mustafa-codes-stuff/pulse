import { stripHtml } from './tfidf';

const BUG_REGEX = /\b(bug|broken|error|crash|fail|failing|failed|doesn't work|does not work|stuck|glitch|issue|not loading|incorrect|wrong|payment error)\b/i;
const FEATURE_REGEX = /\b(would love|please add|not supported|feature|can you add|missing|wish|suggestion|idea|could you add)\b/i;
const REFUND_REGEX = /\b(refund|cancel|cancelation|cancellation|money back|unsubscribe|charge)\b/i;

export type TicketClassification = 'bug' | 'feature_request' | 'other';

/**
 * Classify a conversation as a bug, feature request, or other based on simple heuristics.
 */
export function classifyConversation(title: string, body: string | null | undefined): TicketClassification {
  const text = (title + ' ' + stripHtml(body)).toLowerCase();
  
  // Exclude explicit billing/refund issues from being classified as bugs or features
  if (REFUND_REGEX.test(text)) {
    return 'other';
  }

  // Check for bug keywords first
  if (BUG_REGEX.test(text)) {
    return 'bug';
  }
  
  // Then check for feature request keywords
  if (FEATURE_REGEX.test(text)) {
    return 'feature_request';
  }
  
  return 'other';
}

/**
 * Check if the conversation references images or attachments.
 */
export function hasAttachmentReferences(body: string | null | undefined): boolean {
  if (!body) return false;
  const lowerBody = body.toLowerCase();
  
  // Heuristic: looking for image tags, attachment links, or common phrases
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
