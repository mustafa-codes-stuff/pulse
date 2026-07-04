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

  // Generate realistic reopens (ensure a few have >= 2 for High Friction tests)
  let countReopens = 0;
  let r = Math.random();
  if (r > 0.98) countReopens = 2; // ~2%
  else if (r > 0.95) countReopens = 1; // ~3%
  
  // Generate realistic handling time (mostly 1hr, but some huge outliers for p90 tests)
  let handlingTime = Math.floor(Math.random() * 3600); // 0-1hr
  if (Math.random() > 0.85) handlingTime = Math.floor(Math.random() * 86400); // Up to 24hrs for top 15%

  const numParts = Math.floor(Math.random() * 8) + 2; // 2 to 9 parts
  const parts = [];
  let currentTime = createdAt + 60;
  
  const admins = [
    { id: "admin_1", type: "admin", name: "Alice Support" },
    { id: "admin_2", type: "admin", name: "Bob Engineer" },
    { id: "admin_3", type: "admin", name: "Charlie CS" }
  ];
  
  const botAuthor = { id: "bot_1", type: "bot", name: "Automation Bot" };
  const userAuthor = { id: "user_1", type: "user", name: `User ${i}` };
  
  const assignedAdmin = admins[Math.floor(Math.random() * admins.length)];

  for (let p = 0; p < numParts; p++) {
    currentTime += Math.floor(Math.random() * 3600); // add 0-1hr between parts
    const partTypeRand = Math.random();
    
    let partType = 'comment';
    let author = assignedAdmin;
    let body = 'This is a standard reply.';
    
    if (partTypeRand > 0.8) {
      partType = 'note';
      body = 'Internal note: checking on this.';
      author = assignedAdmin;
    } else if (partTypeRand > 0.6) {
      partType = 'comment';
      body = 'I still need help with this.';
      author = userAuthor;
    } else if (partTypeRand > 0.5) {
      partType = 'attribute_collected';
      body = null;
      author = botAuthor;
    } else if (partTypeRand > 0.4) {
      partType = 'snoozed';
      body = null;
      author = assignedAdmin;
    } else {
      partType = 'comment';
      body = `Agent reply to address the ${aiTitle.toLowerCase()}.`;
      author = assignedAdmin;
    }
    
    parts.push({
      id: `part_${i}_${p}`,
      part_type: partType,
      body: body,
      created_at: currentTime,
      author: author
    });
  }

  conversations.push({
    type: "conversation",
    id: `conv_${i}_${Math.floor(Math.random() * 10000)}`,
    created_at: createdAt,
    updated_at: currentTime,
    waiting_since: state === 'open' ? createdAt + 1800 : null,
    snoozed_until: state === 'snoozed' ? now + 86400 : null,
    source: {
      type: source,
      subject: subject,
      body: `Customer says: ${subject}. Please investigate.`,
      author: userAuthor,
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
      count_reopens: countReopens,
      count_assignments: 1,
      count_conversation_parts: parts.length,
      handling_time: handlingTime
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
      conversation_parts: parts,
      total_count: parts.length
    },
    _sourceFilename: 'sample-conversations.json'
  });
}

const outputPath = path.join(__dirname, '..', 'public', 'sample-conversations.json');
fs.writeFileSync(outputPath, JSON.stringify(conversations, null, 2));
console.log(`Generated ${NUM_CONVERSATIONS} dummy conversations to ${outputPath}`);
