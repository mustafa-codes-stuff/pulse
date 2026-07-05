import { PulseConversation } from '../types';

const SYSTEM_SUBJECTS = [
  "business manager partner request",
  "privacy rights request",
  "verify your email",
  "security alert",
  "apple account information",
  "data erasure request"
];

export function filterAnalyzableConversations(
  conversations: PulseConversation[],
  excludeNoHumanParts?: boolean
): {
  analyzable: PulseConversation[];
  excludedSystem: PulseConversation[];
  excludedNoHuman: PulseConversation[];
} {
  const analyzable: PulseConversation[] = [];
  const excludedSystem: PulseConversation[] = [];
  const excludedNoHuman: PulseConversation[] = [];

  for (const conv of conversations) {
    const subject = (conv.source.subject || '').toLowerCase();
    
    // Check if it's a known system notification
    const isSystem = SYSTEM_SUBJECTS.some(sysSubj => subject.includes(sysSubj));
    if (isSystem) {
      excludedSystem.push(conv);
      continue;
    }
    
    // Check if it has no human parts (real leads that haven't received responses)
    const parts = conv.conversation_parts?.conversation_parts || [];
    const humanParts = parts.filter(p => p.author?.type === 'user' || p.author?.type === 'lead');
    const isNoHuman = humanParts.length === 0;

    if (isNoHuman) {
      excludedNoHuman.push(conv);
      if (excludeNoHumanParts) {
        continue;
      }
    }

    analyzable.push(conv);
  }

  return { analyzable, excludedSystem, excludedNoHuman };
}
