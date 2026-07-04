import { generateFallbackTitle } from '../../lib/nlp/heuristics';

describe('Fallback Title Extraction', () => {
  it('handles null, undefined, or empty body', () => {
    expect(generateFallbackTitle(null)).toBe('Untitled Conversation');
    expect(generateFallbackTitle(undefined)).toBe('Untitled Conversation');
    expect(generateFallbackTitle('')).toBe('Untitled Conversation');
    expect(generateFallbackTitle('   ')).toBe('Untitled Conversation');
  });

  it('strips HTML from body and truncates correctly', () => {
    const htmlBody = '<p>Hello <b>World</b>, this is a very long string that should get truncated at exactly 60 characters so we can test it.</p>';
    // "Hello World, this is a very long string that should get truncat..."
    
    const result = generateFallbackTitle(htmlBody);
    
    // length of "Hello World, this is a very long string that should get trunca" is 60.
    // + "..." is 63.
    
    expect(result.length).toBeLessThanOrEqual(63);
    expect(result).toBe('Hello World , this is a very long string that should get tru...');
  });

  it('does not truncate short text', () => {
    const text = 'Hello world!';
    expect(generateFallbackTitle(text)).toBe('Hello world!');
  });
  
  it('handles HTML-only bodies gracefully', () => {
    const htmlBody = '<p><br/></p>';
    expect(generateFallbackTitle(htmlBody)).toBe('Untitled Conversation');
  });
});
