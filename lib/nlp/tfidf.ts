const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'in', 'and', 'a', 'to', 'for', 'of', 'with', 'that', 'this',
  'it', 'you', 'i', 'we', 'they', 'are', 'was', 'as', 'be', 'or', 'by', 'an', 'not', 'if', 'from',
  'but', 'what', 'all', 'were', 'when', 'can', 'your', 'my', 'has', 'have', 'do', 'so', 'out',
  'up', 'about', 'how', 'who', 'will', 'would', 'could', 'should', 'there', 'their', 'then',
  'them', 'these', 'those', 'me', 'am', 'hi', 'hello', 'thanks', 'please', 'just', 'like'
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
