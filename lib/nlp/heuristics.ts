import { stripHtml } from './tfidf';

const BUG_KEYWORDS = ['bug', 'broken', 'error', 'crash', 'fail', 'doesn\'t work', 'does not work', 'stuck', 'glitch'];
const FEATURE_KEYWORDS = ['would love', 'please add', 'not supported', 'feature', 'can you add', 'missing', 'wish'];

export type TicketClassification = 'bug' | 'feature_request' | 'other';

/**
 * Classify a conversation as a bug, feature request, or other based on simple heuristics.
 */
export function classifyConversation(title: string, body: string | null | undefined): TicketClassification {
  const text = (title + ' ' + stripHtml(body)).toLowerCase();
  
  // Check for bug keywords first
  for (const keyword of BUG_KEYWORDS) {
    if (text.includes(keyword)) {
      return 'bug';
    }
  }
  
  // Then check for feature request keywords
  for (const keyword of FEATURE_KEYWORDS) {
    if (text.includes(keyword)) {
      return 'feature_request';
    }
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
