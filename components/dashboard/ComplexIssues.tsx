"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { AlertOctagon, ArrowRight, MessageSquareWarning } from 'lucide-react';
import ConversationModal from './ConversationModal';
import { format, fromUnixTime } from 'date-fns';

export default function ComplexIssues({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const topComplexIssues = useMemo(() => {
    // Sort by count_conversation_parts descending
    return [...data]
      .sort((a, b) => (b.statistics?.count_conversation_parts || 0) - (a.statistics?.count_conversation_parts || 0))
      .slice(0, 5);
  }, [data]);

  return (
    <div className="w-full p-6 bg-card border border-border rounded-xl flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-chart-1" /> Deep Systemic Issues
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Top 5 most complex tickets requiring extensive troubleshooting.
        </p>
      </div>
      
      <div className="flex-1 flex flex-col gap-3">
        {topComplexIssues.map((conv, idx) => {
          const parts = conv.statistics?.count_conversation_parts || 0;
          const displayTitle = conv.title || conv.custom_attributes?.['AI Title'] as string || 'Untitled Conversation';
          
          return (
            <div 
              key={conv.id}
              onClick={() => {
                setModalTitle(`Complex Issue: ${conv.id}`);
                setModalData([conv]);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary transition-colors cursor-pointer group"
            >
              <div className="w-12 h-12 shrink-0 rounded-full bg-chart-1/10 flex flex-col items-center justify-center text-chart-1 border border-chart-1/20">
                <span className="text-lg font-bold leading-none">{parts}</span>
                <span className="text-[9px] font-medium uppercase mt-0.5">Msgs</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground line-clamp-1">{displayTitle}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>ID: {conv.id}</span>
                  <span>•</span>
                  <span>{format(fromUnixTime(conv.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
              
              <div className="w-8 shrink-0 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}

        {topComplexIssues.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageSquareWarning className="w-8 h-8 opacity-20" />
            <p className="text-sm">No complex issues found.</p>
          </div>
        )}
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
