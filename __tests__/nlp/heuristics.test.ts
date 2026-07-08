import { classifyConversation, CATEGORY_PRIORITY } from '../../lib/nlp/heuristics';
import { PulseConversation } from '../../lib/types';

describe('Heuristics NLP', () => {
  it('exposes a valid priority order', () => {
    expect(CATEGORY_PRIORITY.length).toBeGreaterThan(10);
    expect(CATEGORY_PRIORITY[0].category).toBe('system_automated'); // spam is highest
  });

  it('classifies single intent tickets correctly', () => {
    const conv = {
      title: 'I want a refund',
      source: { body: 'Give me my money back' },
      conversation_parts: { conversation_parts: [] }
    } as unknown as PulseConversation;

    const result = classifyConversation(conv);
    expect(result.category).toBe('refund_request');
    expect(result.confidence).toBe('high');
    expect(result.is_dual_intent).toBeFalsy();
  });

  it('classifies dual intent tickets and cross tags them', () => {
    const conv = {
      title: 'Refund requested',
      source: { body: 'I want my money back because the app crashed and froze.' },
      conversation_parts: { conversation_parts: [] }
    } as unknown as PulseConversation;

    const result = classifyConversation(conv);
    expect(result.category).toBe('refund_request');
    expect(result.confidence).toBe('low'); // Dual intent (refund + crash)
    
    // Cross tagging for engineering since it mentioned a crash
    expect(result.also_relevant_to).toContain('engineering');
    expect(result.cross_tag_reasons?.engineering).toBe('crashed');
  });

  it('cross tags product_quality for refund requests caused by bad photos', () => {
    const conv = {
      title: 'Money back',
      source: { body: 'The photos were blurry and weird, refund me.' },
      conversation_parts: { conversation_parts: [] }
    } as unknown as PulseConversation;

    const result = classifyConversation(conv);
    expect(result.category).toBe('refund_request');
    expect(result.confidence).toBe('low');
    
    expect(result.also_relevant_to).toContain('product_quality');
    expect(result.cross_tag_reasons?.product_quality).toBe('blurry');
  });

  it('prioritizes double charge over general payment', () => {
    const conv = {
      title: 'Payment issue',
      source: { body: 'I was charged twice for my checkout.' },
      conversation_parts: { conversation_parts: [] }
    } as unknown as PulseConversation;

    const result = classifyConversation(conv);
    // Previously, payment was checked before double_charge.
    // The explicit array fixes this priority.
    expect(result.category).toBe('double_charge_payment');
  });
});
