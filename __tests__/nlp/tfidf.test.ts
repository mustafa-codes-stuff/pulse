import { extractTopThemes, tokenize, stripHtml } from '../../lib/nlp/tfidf';

describe('tfidf utilities', () => {
  describe('stripHtml', () => {
    it('removes html tags', () => {
      expect(stripHtml('<p>Hello <b>world</b>!</p>')).toBe(' Hello  world ! ');
    });
  });

  describe('tokenize', () => {
    it('lowercases and extracts valid words excluding stop words', () => {
      const text = "The quick brown fox jumps over the lazy dog in the app.";
      const tokens = tokenize(text);
      expect(tokens).toContain('quick');
      expect(tokens).toContain('brown');
      expect(tokens).toContain('fox');
      expect(tokens).toContain('dog');
      expect(tokens).toContain('app');
      
      // Stop words removed
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('in');
    });
  });

  describe('extractTopThemes', () => {
    it('surfaces the dominant term near the top', () => {
      const corpus = [
        "I need a refund for my order",
        "Where is my refund?",
        "Please process my refund ASAP",
        "The app crashed again",
        "Refund not received"
      ];
      
      const themes = extractTopThemes(corpus, 5);
      
      // "refund" should be the #1 theme
      expect(themes[0].term).toBe('refund');
      expect(themes[0].count).toBe(4);
    });
  });
});
