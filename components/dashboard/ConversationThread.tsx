"use client";

import { PulseConversation } from '@/lib/types';
import { format, fromUnixTime } from 'date-fns';
import { User, Bot, Shield, FileJson } from 'lucide-react';

export default function ConversationThread({ 
  conversation,
  onViewRawLog 
}: { 
  conversation: PulseConversation;
  onViewRawLog?: () => void;
}) {
  // Combine initial message and subsequent parts
  const allParts = [
    {
      id: 'initial_message',
      type: 'initial',
      body: conversation.source.body,
      created_at: conversation.created_at,
      author: conversation.source.author,
    },
    ...(conversation.conversation_parts?.conversation_parts || []).map(p => ({
      id: p.id,
      type: p.part_type,
      body: p.body,
      created_at: p.created_at,
      author: p.author,
    }))
  ];

  // Filter out system noise. We only want initial message, comments, and notes
  const visibleParts = allParts
    .filter(p => p.type === 'initial' || p.type === 'comment' || p.type === 'note')
    .sort((a, b) => a.created_at - b.created_at);

  const getAuthorIcon = (type: string) => {
    switch(type) {
      case 'user':
      case 'lead': return <User className="w-4 h-4" />;
      case 'bot': return <Bot className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-full flex flex-col bg-background p-6 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
        <div>
          <h4 className="font-semibold text-foreground/80 flex items-center gap-2">
            Conversation History
          </h4>
        </div>
        <div className="flex items-center gap-3">
          {Boolean(conversation.custom_attributes?.['Has attachments']) && (
            <span className="text-xs font-medium text-chart-4 bg-chart-4/10 px-2 py-1 rounded">Has Attachments</span>
          )}
          {onViewRawLog && (
            <button 
              onClick={onViewRawLog}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors cursor-pointer"
            >
              <FileJson className="w-4 h-4" /> View Raw Log
            </button>
          )}
        </div>
      </div>

      <div 
        className="flex flex-col gap-6 w-full max-w-3xl mx-auto" 
        role="log" 
        aria-label="Conversation history"
        aria-live="polite"
      >
        {visibleParts.map((part) => {
          const isUser = part.author?.type === 'user' || part.author?.type === 'lead';
          const isNote = part.type === 'note';
          const label = isUser ? "Customer message" : isNote ? "Internal note" : "Agent message";
          
          return (
            <div key={part.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}
                role="article"
                aria-label={`${label} from ${part.author?.name || 'Unknown'} at ${format(fromUnixTime(part.created_at), 'MMM d, h:mm a')}`}
              >
                
                {/* Author & Timestamp */}
                <div className="flex items-center gap-2 mb-1.5 px-1" aria-hidden="true">
                  {!isUser && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-secondary text-muted-foreground shadow-sm">
                      {getAuthorIcon(part.author?.type || 'admin')}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-foreground/80">
                    {part.author?.name || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(fromUnixTime(part.created_at), 'MMM d, h:mm a')}
                  </span>
                  {isNote && (
                    <span className="text-[10px] font-bold text-chart-3 bg-chart-3/10 px-1.5 py-0.5 rounded uppercase">Internal Note</span>
                  )}
                </div>

                {/* Bubble */}
                <div 
                  className={`
                    px-4 py-3 rounded-2xl text-sm break-words shadow-sm
                    ${isUser 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : isNote
                        ? 'bg-chart-3/15 text-foreground border border-chart-3/30 rounded-tl-sm'
                        : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                    }
                  `}
                >
                  {part.body ? (
                    <div 
                      className="whitespace-pre-wrap break-words [&>p]:mb-2 last:[&>p]:mb-0 [&>div]:mb-2 last:[&>div]:mb-0 [&_*]:!bg-transparent [&_*]:!text-inherit"
                      dangerouslySetInnerHTML={{ __html: part.body }}
                    />
                  ) : (
                    <span className="italic opacity-70">Empty message</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {visibleParts.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No conversation history available.</p>
        )}
      </div>
    </div>
  );
}
