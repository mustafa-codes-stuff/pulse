import { 
  aggregateAgentPerformance, 
  calculateHighFrictionP90, 
  isHighFriction,
  aggregateIssues
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
      ] as any as PulseConversation[];

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

  describe('High Friction Heuristics', () => {
    it('returns a fallback of 24h for datasets < 50 items', () => {
      const data = Array.from({ length: 10 }).map(() => ({} as PulseConversation));
      expect(calculateHighFrictionP90(data)).toBe(86400);
    });

    it('calculates the p90 accurately for large datasets', () => {
      const data = Array.from({ length: 100 }).map((_, i) => ({
        statistics: { handling_time: (i + 1) * 1000 } // 1000, 2000, ..., 100000
      })) as any as PulseConversation[];
      
      const p90 = calculateHighFrictionP90(data);
      expect(p90).toBe(90100); 
    });

    it('flags high friction based on reopens or p90 time', () => {
      const p90 = 50000;
      
      // Below threshold
      expect(isHighFriction({
        statistics: { count_reopens: 1, handling_time: 40000 }
      } as any, p90)).toBe(false);

      // Flagged by reopens
      expect(isHighFriction({
        statistics: { count_reopens: 2, handling_time: 40000 }
      } as any, p90)).toBe(true);

      // Flagged by handling time
      expect(isHighFriction({
        statistics: { count_reopens: 0, handling_time: 60000 }
      } as any, p90)).toBe(true);
    });


  describe('aggregateIssues', () => {
    it('aggregates bugs and feature requests, returning top 5 counts for each', () => {
      const dummyConversations = [
        { title: 'App crashes on login', source: { body: 'When I click login it dies' }, custom_attributes: { 'AI Title': 'Login Crash' } },
        { title: 'Crash at startup', source: { body: 'I get a stacktrace when opening' }, custom_attributes: { 'AI Title': 'Login Crash' } },
        { title: 'Dark mode', source: { body: 'Please add a dark theme' }, custom_attributes: { 'AI Title': 'Dark Theme Request' } },
        { title: 'Add a dark theme', source: { body: 'I would love a dark theme' }, custom_attributes: { 'AI Title': 'Dark Theme Request' } },
        { title: 'Another feature', source: { body: 'Can you add offline support' }, custom_attributes: { 'AI Title': 'Offline Mode' } },
      ] as any as PulseConversation[];

      const result = aggregateIssues(dummyConversations);
      
      // Based on our simple NLP heuristics (which classify crash/dies as bugs, and please/add as feature_request)
      expect(result.bugs.length).toBe(1);
      expect(result.bugs[0].title).toBe('Login Crash');
      expect(result.bugs[0].count).toBe(2);

      expect(result.features.length).toBe(2);
      expect(result.features[0].title).toBe('Dark Theme Request');
      expect(result.features[0].count).toBe(2);
      expect(result.features[1].title).toBe('Offline Mode');
      expect(result.features[1].count).toBe(1);
    });
  });
});
});
