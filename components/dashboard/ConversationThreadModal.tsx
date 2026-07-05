"use client";

import { useEffect } from 'react';
import { PulseConversation } from '@/lib/types';
import ConversationThread from './ConversationThread';
import { X, Calendar, FileText } from 'lucide-react';
import { format, fromUnixTime } from 'date-fns';

interface ConversationThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: PulseConversation | null;
}

export default function ConversationThreadModal({ isOpen, onClose, conversation }: ConversationThreadModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen || !conversation) return null;

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6 md:p-12"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/30 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold truncate">{conversation.title || conversation.custom_attributes?.['AI Title'] as string || 'Conversation Thread'}</h2>
            <p className="text-sm text-muted-foreground mt-1 truncate mb-3">
              {conversation.source.subject || 'No subject'}
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background text-xs font-medium text-foreground/80 border border-border shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {format(fromUnixTime(conversation.created_at), 'MMMM d, yyyy HH:mm')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background text-xs font-medium text-foreground/80 border border-border shadow-sm">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                {conversation._sourceFilename || 'Unknown Source'}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/5 p-6">
          <ConversationThread 
            conversation={conversation} 
          />
        </div>
      </div>
    </div>
  );
}
