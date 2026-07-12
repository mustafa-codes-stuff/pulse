"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { AlertOctagon, MessageSquareWarning } from 'lucide-react';
import ConversationThreadModal from './ConversationThreadModal';
import { formatPT } from '@/lib/utils/timezone';
import { extractFrustrationPairs } from '@/lib/analytics/aggregations';

export default function FlaggedMoments({ data, isTab = false }: { data: PulseConversation[], isTab?: boolean }) {
  const [selectedConversation, setSelectedConversation] = useState<PulseConversation | null>(null);

  const flaggedPairs = useMemo(() => {
    return extractFrustrationPairs(data);
  }, [data]);

  return (
    <div className="w-full flex flex-col h-full">
      {!isTab && (
        <div className="flex items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-destructive" />
              <h2 className="text-base font-semibold">Frustration history</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Unresolved customer sentiment following an agent&apos;s response.</p>
          </div>
          <div className="text-xs font-medium bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
            {flaggedPairs.length} flagged
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flaggedPairs.length === 0 ? (
            <div className="md:col-span-2 py-8 flex flex-col items-center justify-center text-muted-foreground text-sm h-full bg-secondary/10 rounded-xl border-2 border-border border-dashed">
              <p>No post-reply frustration detected.</p>
            </div>
          ) : (
            flaggedPairs.map((pair, idx) => {
              const { conversation: conv, agentName, agentReplySnippet, customerReplySnippet } = pair;
              const displayTitle = conv.title || conv.custom_attributes?.['AI Title'] as string || 'Untitled Conversation';
              
              return (
                <div 
                  key={`${conv.id}-${idx}`} 
                  onClick={() => setSelectedConversation(conv)}
                  className="group p-4 bg-destructive/5 rounded-xl border border-destructive/20 hover:bg-destructive/10 transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MessageSquareWarning className="w-4 h-4 text-destructive" />
                        <span className="text-sm font-semibold text-destructive line-clamp-1">{displayTitle}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-4 text-xs leading-relaxed">
                      <div className="bg-background/80 rounded-md px-2.5 py-1.5 border border-border/50">
                        <span className="font-semibold text-foreground mr-1.5">{agentName}:</span>
                        <span className="text-muted-foreground line-clamp-2">&quot;{agentReplySnippet}&quot;</span>
                      </div>
                      <div className="bg-destructive/10 rounded-md px-2.5 py-1.5 border border-destructive/20">
                        <span className="font-semibold text-destructive mr-1.5">Customer:</span>
                        <span className="text-foreground/80 line-clamp-2">&quot;{customerReplySnippet}&quot;</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-destructive/10">
                    <span className="font-medium">{formatPT(conv.created_at, "MMM d, yyyy 'PST'")}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConversationThreadModal
        isOpen={!!selectedConversation}
        onClose={() => setSelectedConversation(null)}
        conversation={selectedConversation}
      />
    </div>
  );
}
