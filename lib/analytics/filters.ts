import { PulseConversation } from '../types';

const SYSTEM_SUBJECTS = [
  "business manager partner request",
  "privacy rights request",
  "verify your email",
  "security alert",
  "apple account information",
  "data erasure request"
];

export function isBotOnlyConversation(conv: PulseConversation): boolean {
  const parts = conv.conversation_parts?.conversation_parts || [];
  const hadBotPart = parts.some(p => p.author?.type === 'bot');
  const hadHumanAgent = parts.some(p => p.author?.type === 'admin');
  return hadBotPart && !hadHumanAgent;
}

export function filterAnalyzableConversations(
  conversations: PulseConversation[],
  excludeNoHumanParts?: boolean
): {
  analyzable: PulseConversation[];
  excludedSystem: PulseConversation[];
  excludedNoReply: PulseConversation[];
  excludedBotOnly: PulseConversation[];
} {
  const analyzable: PulseConversation[] = [];
  const excludedSystem: PulseConversation[] = [];
  const excludedNoReply: PulseConversation[] = [];
  const excludedBotOnly: PulseConversation[] = [];

  for (const conv of conversations) {
    const subject = (conv.source.subject || '').toLowerCase();
    
    // Check if it's a known system notification
    const isSystem = SYSTEM_SUBJECTS.some(sysSubj => subject.includes(sysSubj));
    if (isSystem) {
      excludedSystem.push(conv);
      continue;
    }
    
    // Check if it has no customer/lead messages (meaning customer never replied/sent anything)
    const parts = conv.conversation_parts?.conversation_parts || [];
    const customerParts = parts.filter(p => p.author?.type === 'user' || p.author?.type === 'lead');
    const isNoReply = customerParts.length === 0;

    // Check if it's handled only by bot
    const isBotOnly = isBotOnlyConversation(conv);

    if (isNoReply) {
      excludedNoReply.push(conv);
    }
    
    if (isBotOnly) {
      excludedBotOnly.push(conv);
    }

    if (excludeNoHumanParts && (isNoReply || isBotOnly)) {
      continue;
    }

    analyzable.push(conv);
  }

  return { analyzable, excludedSystem, excludedNoReply, excludedBotOnly };
}
