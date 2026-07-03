const fs = require('fs');
const { format, fromUnixTime } = require('date-fns');

const data = JSON.parse(fs.readFileSync('./public/sample-conversations.json', 'utf8'));

const map = new Map();

for (const conv of data) {
  const dateStr = format(fromUnixTime(conv.created_at), 'yyyy-MM-dd');
  if (!map.has(dateStr)) {
    map.set(dateStr, { date: dateStr, total: 0, open: 0, closed: 0, snoozed: 0 });
  }
  const record = map.get(dateStr);
  record.total++;
}

console.log(Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5));
