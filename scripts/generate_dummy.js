const fs = require('fs');
const path = require('path');

const NUM_CONVERSATIONS = 100;
const STATES = ['open', 'closed', 'snoozed'];
const SOURCES = ['email', 'conversation'];
const SUBJECTS = [
  'Cannot upload avatar', 'Bug with billing page', 'Feature request: dark mode',
  'How do I change my password?', 'Issue with professional headshots',
  'App crashing on startup', 'Need help with team billing', 'Missing files after sync',
  'Login failed', 'Where can I find the invoice?'
];

const conversations = [];
const now = Date.now() / 1000;
const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

for (let i = 1; i <= NUM_CONVERSATIONS; i++) {
  const createdAt = Math.floor(thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo));
  const state = STATES[Math.floor(Math.random() * STATES.length)];
  const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
  const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
  
  const isBug = subject.toLowerCase().includes('bug') || subject.toLowerCase().includes('crash') || subject.toLowerCase().includes('issue') || subject.toLowerCase().includes('failed');
  const isFeature = subject.toLowerCase().includes('feature') || subject.toLowerCase().includes('mode');
  
  let aiTitle = isBug ? 'Bug Report' : isFeature ? 'Feature Request' : 'General Inquiry';
  
  const hasAttachments = Math.random() > 0.7;

  conversations.push({
    type: "conversation",
    id: `conv_${i}_${Math.floor(Math.random() * 10000)}`,
    created_at: createdAt,
    updated_at: createdAt + 3600,
    waiting_since: state === 'open' ? createdAt + 1800 : null,
    snoozed_until: state === 'snoozed' ? now + 86400 : null,
    source: {
      type: source,
      subject: subject,
      body: `Customer says: ${subject}. Please investigate.`,
      author: {
        type: "user",
        name: `User ${i}`
      },
      attachments: hasAttachments ? [{ type: 'image', url: 'http://example.com/img.png' }] : []
    },
    open: state === 'open',
    state: state,
    tags: { tags: [] },
    priority: Math.random() > 0.8 ? "priority" : "not_priority",
    sla_applied: null,
    statistics: {
      time_to_assignment: Math.floor(Math.random() * 3600),
      time_to_admin_reply: Math.floor(Math.random() * 7200),
      time_to_first_close: state === 'closed' ? Math.floor(Math.random() * 86400) : null,
      time_to_last_close: state === 'closed' ? Math.floor(Math.random() * 86400) : null,
      median_time_to_reply: Math.floor(Math.random() * 1800),
      count_reopens: Math.random() > 0.8 ? 1 : 0,
      count_assignments: 1,
      count_conversation_parts: Math.floor(Math.random() * 10) + 1,
      handling_time: Math.floor(Math.random() * 3600)
    },
    conversation_rating: null,
    title: subject,
    custom_attributes: {
      "AI Title": aiTitle,
      "Has attachments": hasAttachments
    },
    ai_agent_participated: Math.random() > 0.5,
    company: null,
    conversation_parts: {
      conversation_parts: [],
      total_count: 0
    },
    _sourceFilename: 'sample-conversations.json'
  });
}

const outputPath = path.join(__dirname, '..', 'public', 'sample-conversations.json');
fs.writeFileSync(outputPath, JSON.stringify(conversations, null, 2));
console.log(`Generated ${NUM_CONVERSATIONS} dummy conversations to ${outputPath}`);
