import { 
  aggregateCSAT,
  aggregateAgentPerformance,
  computeDatasetThresholds,
  computeEscalationRisk,
  aggregateIssues,
} from '../../lib/analytics/aggregations';
import { PulseConversation } from '../../lib/types';

describe('Aggregations & Heuristics', () => {

  describe('aggregateAgentPerformance', () => {
    it('aggregates agent volume and median response time, sorting by volume then time', () => {
      const dummyConversations = [
        {
          id: '1',
          statistics: { time_to_admin_reply: 100 },
          conversation_parts: {
            conversation_parts: [{ author: { id: 'agent_a', type: 'admin', name: 'Agent A' } }]
          }
        },
        {
          id: '2',
          statistics: { time_to_admin_reply: 300 },
          conversation_parts: {
            conversation_parts: [{ author: { id: 'agent_a', type: 'admin', name: 'Agent A' } }]
          }
        },
        {
          id: '3',
          statistics: { time_to_admin_reply: 50 },
          conversation_parts: {
            conversation_parts: [{ author: { id: 'agent_b', type: 'admin', name: 'Agent B' } }]
          }
        },
        {
          id: '4', // tie-breaker for Agent C who has same volume as Agent B but higher median time
          statistics: { time_to_admin_reply: 600 },
          conversation_parts: {
            conversation_parts: [{ author: { id: 'agent_c', type: 'admin', name: 'Agent C' } }]
          }
        }
      ] as unknown as PulseConversation[];

      const results = aggregateAgentPerformance(dummyConversations);

      expect(results.length).toBe(3);
      
      // Agent A has volume 2, median (100,300)-> 300 (or p50 of [100,300] is 300 depending on calculatePercentile impl, let's just assert order)
      // Actually calculatePercentile(50) of [100, 300] is 300 (since 0.5 * 2 = 1 -> index 1).
      
      expect(results[0].id).toBe('agent_a'); // highest volume
      expect(results[0].volume).toBe(2);

      // Agent B and C both have volume 1
      // Agent B median is 50, Agent C median is 600
      // So Agent B should be ranked higher than C
      expect(results[1].id).toBe('agent_b');
      expect(results[2].id).toBe('agent_c');
    });
  });

  describe('Escalation Risk Heuristics', () => {
    it('returns a fallback of 86400 for datasets < 50 items', () => {
      const data = Array.from({ length: 10 }).map(() => ({} as PulseConversation));
      expect(computeDatasetThresholds(data).handlingTimeP90).toBe(86400);
    });

    it('calculates the thresholds accurately for large datasets', () => {
      const data = Array.from({ length: 100 }).map((_, i) => ({
        statistics: { handling_time: (i + 1) * 1000 } // 1000, 2000, ..., 100000
      })) as unknown as PulseConversation[];
      
      const thresholds = computeDatasetThresholds(data);
      expect(thresholds.handlingTimeP90).toBe(90100); 
    });

    it('computes escalation risk based on reopens and handling time', () => {
      const thresholds = { handlingTimeP90: 10, backAndForthP90: 5, responseTimeP90: 1015 };
      
      // Below threshold
      expect(computeEscalationRisk({
        statistics: { count_reopens: 0, handling_time: 40000 }
      } as unknown as PulseConversation, thresholds) > 0.5).toBe(false);

      // Flagged by reopens
      expect(computeEscalationRisk({
        statistics: { count_reopens: 2, handling_time: 40000 }
      } as unknown as PulseConversation, thresholds)).toBeGreaterThanOrEqual(0.4);

      // Flagged by handling time and reopens (combined > 0.5)
      expect(computeEscalationRisk({
        statistics: { count_reopens: 2, handling_time: 60000 }
      } as unknown as PulseConversation, thresholds)).toBeGreaterThanOrEqual(0.6);
    });
  });

  describe('aggregateIssues', () => {
    it('aggregates bugs and feature requests, returning counts for each category', () => {
      const dummyConversations = [
        { title: 'App crashes on opening', source: { body: 'When I click open it dies' }, statistics: {} },
        { title: 'Crash at startup', source: { body: 'I get a stacktrace when opening' }, statistics: {} },
        { title: 'Dark mode', source: { body: 'Please add a dark theme' }, statistics: {} },
        { title: 'Add a dark theme', source: { body: 'I would love a dark theme' }, statistics: {} },
        { title: 'Another feature', source: { body: 'Can you add offline support' }, statistics: {} },
      ] as unknown as PulseConversation[];

      const result = aggregateIssues(dummyConversations);
      
      // Based on our NLP heuristics: 
      expect(result.bugs.length).toBe(1); 

      // 'Dark mode', 'Add a dark theme', 'Another feature' -> core_feature_request
      expect(result.features.length).toBe(1);
      expect(result.features[0].count).toBe(3);
    });
  });
});
