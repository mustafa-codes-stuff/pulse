"use client";

import { useEffect, useRef, useMemo, useState } from 'react';
import { PulseConversation } from '@/lib/types';
import { formatPT } from '@/lib/utils/timezone';
import { User, Bot, Shield, AlertTriangle, Lightbulb, Wrench, Star, Activity, TrendingUp, Bug, CheckCircle2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { hasFrustrationPattern, getVisibleParts, getFrustratedParts } from '@/lib/analytics/aggregations';

export default function ConversationThread({ 
  conversation,
  viewContext = 'support'
}: { 
  conversation: PulseConversation,
  viewContext?: 'support' | 'engineering'
}) {
  const visibleParts = useMemo(() => getVisibleParts(conversation), [conversation]);
  const flaggedPairs = useMemo(() => getFrustratedParts(conversation), [conversation]);

  const getAuthorIcon = (type: string) => {
    switch(type) {
      case 'user':
      case 'lead': return <User className="w-4 h-4" />;
      case 'bot': return <Bot className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [flaggedPairs]);

  const firstFlaggedId = Array.from(flaggedPairs)[0];

  return (
    <div className="w-full flex flex-col bg-background p-6 rounded-lg border border-border">
      
      {/* AI Executive Summary Panel */}
      {conversation.llm_classification && (
        <div className="mb-8 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              {viewContext === 'support' ? 'Support Analysis' : 'Engineering Analysis'}
            </h3>
          </div>
          
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">User Goal</p>
                <p className="text-sm font-medium text-foreground">{conversation.llm_classification.user_goal || 'Unknown'}</p>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Churn Risk</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${conversation.llm_classification.churn_risk_1_to_10 >= 7 ? 'bg-destructive/10 text-destructive border border-destructive/20' : conversation.llm_classification.churn_risk_1_to_10 >= 4 ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                  {conversation.llm_classification.churn_risk_1_to_10 || 1}/10
                </span>
              </div>
            </div>

            {/* Support Lens Panel */}
            {viewContext === 'support' && (
              <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-background border border-border p-4 rounded-lg flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-chart-4" /> Agent Rating</span>
                    <div className="text-2xl font-bold flex items-baseline gap-1">
                      {conversation.llm_classification.support_insights?.customer_experience_rating || '-'}
                      <span className="text-sm font-medium text-muted-foreground">/10</span>
                    </div>
                  </div>
                  <div className="bg-background border border-border p-4 rounded-lg flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-destructive" /> Degradation Reason</span>
                    <p className="text-sm text-foreground font-medium leading-snug">
                      {conversation.llm_classification.support_insights?.experience_degradation_reason || 'No specific degradation identified.'}
                    </p>
                  </div>
                  <div className="bg-background border border-border p-4 rounded-lg flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-chart-2" /> Improvement Suggestion</span>
                    <p className="text-sm text-foreground font-medium leading-snug">
                      {conversation.llm_classification.support_insights?.agent_improvement_suggestion || 'No suggestion.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Engineering Lens Panel */}
            {viewContext === 'engineering' && (
              <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-background border border-border p-4 rounded-lg flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-indigo-500" /> Issue Type</span>
                    <p className="text-sm font-bold text-foreground">
                      {conversation.llm_classification.engineering_insights?.technical_issue_type || 'None'}
                    </p>
                  </div>
                  <div className="bg-background border border-border p-4 rounded-lg flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Bug className="w-3.5 h-3.5 text-destructive" /> Failure Point</span>
                    <p className="text-sm text-foreground font-medium leading-snug">
                      {conversation.llm_classification.engineering_insights?.specific_failure_point || 'No specific failure identified.'}
                    </p>
                  </div>
                  <div className="bg-background border border-border p-4 rounded-lg flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Action Item</span>
                    <p className="text-sm text-foreground font-medium leading-snug">
                      {conversation.llm_classification.engineering_insights?.engineering_action_item || 'No action item.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
          
          const isFlagged = flaggedPairs.has(part.id);
          
          return (
            <div key={part.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`} ref={part.id === firstFlaggedId ? scrollRef : null}>
              <div 
                className="flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}"
                role="article"
                aria-label={`${label} from ${part.author?.name || 'Unknown'} at ${formatPT(part.created_at, "MMM d, h:mm a 'PST'")}`}
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
                    {formatPT(part.created_at, "MMM d, h:mm a 'PST'")}
                  </span>
                  {isNote && (
                    <span className="text-[10px] font-bold text-chart-3 bg-chart-3/10 px-1.5 py-0.5 rounded uppercase">Internal Note</span>
                  )}
                </div>

                {/* Bubble */}
                {isFlagged && isUser && (
                   <div className="flex items-center gap-1 text-[10px] text-destructive font-bold mb-1 mr-2 px-2 py-0.5 bg-destructive/10 rounded border border-destructive/20">
                     <AlertTriangle className="w-3 h-3" />
                     Frustrated response detected
                   </div>
                )}
                <div 
                  className={`
                    px-4 py-3 rounded-2xl text-sm break-words shadow-sm
                    ${isFlagged && isUser 
                      ? 'bg-destructive/10 text-foreground border-2 border-destructive/50 rounded-tr-sm' 
                      : isFlagged && !isUser
                      ? 'bg-secondary text-secondary-foreground border-2 border-destructive/30 rounded-tl-sm'
                      : isUser 
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
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(part.body) }}
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
