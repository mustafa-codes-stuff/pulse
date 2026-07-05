"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { AlertOctagon, MessageSquareWarning } from 'lucide-react';
import ConversationModal from './ConversationModal';
import { format, fromUnixTime } from 'date-fns';

const FRUSTRATION_PATTERNS = [
  /\bfrustrat/i, /\bdisappoint/i, /\bunacceptable/i, /\bridiculous/i,
  /\bas i said/i, /\bstill not/i, /\bdidn't answer/i, /\balready told/i,
  /\bnot (what|how) i/i, /\bwaste of/i
];

export default function FlaggedMoments({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const flaggedConversations = useMemo(() => {
    return data.filter(conv => {
      const parts = conv.conversation_parts?.conversation_parts || [];
      let hasFrustration = false;
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].author?.type === 'admin') {
          for (let j = i + 1; j < parts.length; j++) {
            if (parts[j].author?.type === 'user' || parts[j].author?.type === 'lead') {
              const body = (parts[j].body || '').replace(/<[^>]*>?/gm, ' ');
              if (FRUSTRATION_PATTERNS.some(pat => pat.test(body))) {
                hasFrustration = true;
              }
              break; 
            }
          }
        }
        if (hasFrustration) break;
      }
      return hasFrustration;
    }).sort((a, b) => b.created_at - a.created_at);
  }, [data]);

  return (
    <div className="w-full h-[400px] bg-card border-2 border-border shadow-sm rounded-xl flex flex-col overflow-hidden">
      <div className="p-6 border-b border-border flex items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold">Continued Frustration After Reply</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Unresolved customer sentiment following an agent's response.</p>
        </div>
        <div className="text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
          {flaggedConversations.length} flagged
        </div>
      </div>
      
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none z-20" />
        <div className="h-full overflow-y-auto p-4 pb-12 grid grid-cols-1 md:grid-cols-2 gap-4 content-start scrollbar-thin">
        {flaggedConversations.length === 0 ? (
          <div className="md:col-span-2 py-8 flex flex-col items-center justify-center text-muted-foreground text-sm h-full">
            <p>No post-reply frustration detected.</p>
          </div>
        ) : (
          flaggedConversations.map(conv => {
            const rawBody = conv.source.body ? conv.source.body.replace(/<[^>]*>?/gm, ' ').trim() : '';
            const cleanSubject = conv.source.subject ? conv.source.subject.replace(/<[^>]*>?/gm, ' ').trim() : '';
            const displayTitle = conv.title || conv.custom_attributes?.['AI Title'] as string || 'Untitled Conversation';
            const displaySubject = cleanSubject || (rawBody.length > 80 ? rawBody.substring(0, 80) + '...' : rawBody) || 'No description provided.';
            
            return (
              <div 
                key={conv.id} 
                onClick={() => {
                  setModalTitle("Flagged Conversation");
                  setModalData([conv]);
                  setIsModalOpen(true);
                }}
                className="group p-5 bg-destructive/5 rounded-xl border border-destructive/20 hover:bg-destructive/10 transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquareWarning className="w-4 h-4 text-destructive" />
                      <span className="text-sm font-semibold text-destructive line-clamp-1">{displayTitle}</span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-3 mb-4 leading-relaxed">
                    {displaySubject}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-destructive/10">
                  <span className="font-medium">{format(fromUnixTime(conv.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      <ConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        conversations={modalData}
      />
    </div>
  );
}
