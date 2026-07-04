import { useEffect } from 'react';
import { PulseConversation } from '@/lib/types';
import ConversationList from './ConversationList';
import EngineeringConversationList from './EngineeringConversationList';
import { X, Filter } from 'lucide-react';

interface ConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  conversations: PulseConversation[];
  type?: 'support' | 'engineering';
  initialFilter?: any;
}

export default function ConversationModal({ isOpen, onClose, title, conversations, type = 'support', initialFilter }: ConversationModalProps) {
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6 md:p-12"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-7xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/30 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">Filtered Results</h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-chart-1/10 border border-chart-1/20 text-chart-1 rounded-full text-xs font-semibold">
                <Filter className="w-3.5 h-3.5" />
                <span>{title}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Showing {conversations.length.toLocaleString()} matching conversations
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/10 p-6">
          {type === 'engineering' ? (
            <EngineeringConversationList data={conversations} initialFilter={initialFilter} isModal={true} />
          ) : (
            <ConversationList data={conversations} initialFilter={initialFilter} isModal={true} />
          )}
        </div>
      </div>
    </div>
  );
}
