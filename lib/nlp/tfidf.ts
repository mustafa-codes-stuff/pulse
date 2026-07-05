import { PulseConversation } from '../types';

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'in', 'and', 'a', 'to', 'for', 'of', 'with', 'that', 'this',
  'it', 'you', 'i', 'we', 'they', 'are', 'was', 'as', 'be', 'or', 'by', 'an', 'not', 'if', 'from',
  'but', 'what', 'all', 'were', 'when', 'can', 'your', 'my', 'has', 'have', 'do', 'so', 'out',
  'up', 'about', 'how', 'who', 'will', 'would', 'could', 'should', 'there', 'their', 'then',
  'them', 'these', 'those', 'me', 'am', 'hi', 'hello', 'thanks', 'please', 'just', 'like',
  'help', 'want', 'need', 'get', 'got', 'photo', 'photos', 'did', 'would',
  'wrong', 'aragon', 'use', 'issue', 'tell', 'using', 'work', 'trying', 'fix', 'error', 'bug', 'issues'
]);

/**
 * Strip HTML tags from a string.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ');
}

/**
 * Tokenize a string into valid lowercase words, omitting stop words and short words.
 */
export function tokenize(text: string): string[] {
  const stripped = stripHtml(text).toLowerCase();
  // Match contiguous alphabetic characters
  const words = stripped.match(/[a-z]+/g) || [];
  return words.filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Extract the top recurring terms (unigrams) from an array of documents.
 * In a real scenario this might do full TF-IDF or bi-grams.
 */
export function extractTopThemes(documents: string[], topK: number = 10): { term: string, count: number }[] {
  const counts = new Map<string, number>();
  
  for (const doc of documents) {
    const tokens = tokenize(doc);
    // Use a set to only count a term once per document (document frequency)
    const uniqueTokens = new Set(tokens);
    
    for (const token of uniqueTokens) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }
  
  const sorted = Array.from(counts.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);
    
  return sorted.slice(0, topK);
}

export interface ThemeCluster {
  theme: string;
  count: number;
  conversations: PulseConversation[];
}

export function extractThemesWithMembership(
  conversations: PulseConversation[],
  topK: number = 8
): ThemeCluster[] {
  const unigramDocCounts = new Map<string, number>();
  const unigramDocMap = new Map<string, Set<PulseConversation>>();
  
  const bigramDocCounts = new Map<string, number>();
  const bigramDocMap = new Map<string, Set<PulseConversation>>();

  for (const conv of conversations) {
    const text = [
      conv.title, 
      conv.source?.subject, 
      conv.source?.body, 
      conv.custom_attributes?.['AI Title']
    ].filter(Boolean).join(' ');

    const tokens = tokenize(text);
    const uniqueTokens = new Set(tokens);
    
    // Unigrams
    for (const token of uniqueTokens) {
      unigramDocCounts.set(token, (unigramDocCounts.get(token) || 0) + 1);
      if (!unigramDocMap.has(token)) unigramDocMap.set(token, new Set());
      unigramDocMap.get(token)!.add(conv);
    }
    
    // Bigrams
    const bigramsInDoc = new Set<string>();
    for (let i = 0; i < tokens.length - 1; i++) {
      const bg = `${tokens[i]} ${tokens[i+1]}`;
      bigramsInDoc.add(bg);
    }
    
    for (const bg of bigramsInDoc) {
      bigramDocCounts.set(bg, (bigramDocCounts.get(bg) || 0) + 1);
      if (!bigramDocMap.has(bg)) bigramDocMap.set(bg, new Set());
      bigramDocMap.get(bg)!.add(conv);
    }
  }

  // Minimum threshold
  const minDocFrequency = 3;
  
  const candidates: { theme: string; count: number; convs: PulseConversation[] }[] = [];
  
  for (const [token, count] of unigramDocCounts.entries()) {
    if (count >= minDocFrequency) {
      candidates.push({ theme: token, count: count, convs: Array.from(unigramDocMap.get(token)!) });
    }
  }
  
  for (const [bg, count] of bigramDocCounts.entries()) {
    if (count >= minDocFrequency) {
      candidates.push({ theme: bg, count: count * 1.5, convs: Array.from(bigramDocMap.get(bg)!) }); // Boost bigrams
    }
  }

  // Sort by count
  candidates.sort((a, b) => b.count - a.count);
  
  return candidates.slice(0, topK).map(c => ({
    theme: c.theme,
    count: c.count,
    conversations: c.convs
  }));
}
