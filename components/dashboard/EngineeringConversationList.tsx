"use client";

import { useState, useMemo, useEffect } from 'react';
import { PulseConversation } from '@/lib/types';
import { Search, ChevronLeft, ChevronRight, Bug, Lightbulb, CheckCircle2, MessageSquareWarning, AlertTriangle, HelpCircle, Split, AlertCircle } from 'lucide-react';
import { classifyConversation } from '@/lib/nlp/heuristics';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { computeDatasetThresholds, computeEscalationRisk, CATEGORY_FRIENDLY_NAMES, hasConversationFrustration } from '@/lib/analytics/aggregations';
import ConversationThread from './ConversationThread';
import { formatPT } from '@/lib/utils/timezone';

export interface ProcessedConversation extends PulseConversation {
  classification: string;
  confidence: 'high' | 'low';
  also_relevant_to?: string[];
  cross_tag_reasons?: Record<string, string>;
  is_dual_intent?: boolean;
  hasAttachments: boolean;
  escalationRisk: number;
}

export default function EngineeringConversationList({ 
  data, 
  activeCategory = 'all',
  isModal = false,
  initialFilter,
  filterTitle,
  onClearFilter
}: { 
  data: PulseConversation[],
  activeCategory?: string,
  isModal?: boolean,
  initialFilter?: { sort?: string },
  filterTitle?: string,
  onClearFilter?: () => void
}) {
  const [search, setSearch] = useState('');
  const [sortFilter, setSortFilter] = useState<string>('escalation_desc');
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setExpandedConvId(null);
  }, [activeCategory, initialFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (initialFilter?.sort) {
      setSortFilter(initialFilter.sort);
    }
  }, [initialFilter]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setExpandedConvId(null);
  };

  const thresholds = useMemo(() => computeDatasetThresholds(data), [data]);

  const processedData = useMemo<ProcessedConversation[]>(() => {
    return data.map(conv => {
      const { category: classification, confidence, also_relevant_to, cross_tag_reasons, is_dual_intent } = conv.llm_classification || { 
        category: 'other', 
        confidence: 'low', 
        also_relevant_to: [], 
        cross_tag_reasons: { engineering: null, product_quality: null }, 
        is_dual_intent: false 
      };
      const hasAttachments = !!conv.custom_attributes?.['Has attachments'] || !!(conv.source.attachments && conv.source.attachments.length > 0);
      const escalationRisk = computeEscalationRisk(conv, thresholds);
      return { ...conv, classification, confidence, also_relevant_to, cross_tag_reasons, is_dual_intent, hasAttachments, escalationRisk };
    });
  }, [data, thresholds]);

  const filteredData = useMemo(() => {
    return processedData.filter(conv => {
      if (activeCategory === 'cross_tagged_engineering') {
        if (!conv.also_relevant_to?.includes('engineering')) return false;
      } else if (activeCategory === 'cross_tagged_product_quality') {
        if (!conv.also_relevant_to?.includes('product_quality')) return false;
      } else if (activeCategory !== 'all') {
        if (conv.classification !== activeCategory) return false;
      }

      if (search) {
        const searchLower = search.toLowerCase();
        const title = (conv.title || '').toLowerCase();
        const body = (conv.source.body || '').toLowerCase();
        const subject = (conv.source.subject || '').toLowerCase();
        const aiTitle = (conv.custom_attributes?.['AI Title'] as string || '').toLowerCase();
        if (!title.includes(searchLower) && !body.includes(searchLower) && !subject.includes(searchLower) && !aiTitle.includes(searchLower)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortFilter === 'newest') return b.created_at - a.created_at;
      if (sortFilter === 'oldest') return a.created_at - b.created_at;
      if (sortFilter === 'needs_review') {
        if (a.confidence === 'low' && b.confidence !== 'low') return -1;
        if (b.confidence === 'low' && a.confidence !== 'low') return 1;
        return b.escalationRisk - a.escalationRisk;
      }
      if (sortFilter === 'escalation_desc') return b.escalationRisk - a.escalationRisk;
      if (sortFilter === 'escalation_asc') return a.escalationRisk - b.escalationRisk;
      return 0;
    });
  }, [processedData, search, activeCategory, sortFilter]);

  const getClassificationBadge = (classification: string) => {
    const bugCategories = ['image_quality_technical', 'generation_accuracy', 'attribute_mismatch', 'auth_access', 'upload_flow', 'payment_checkout', 'other_bugs'];
    const featureCategories = ['customization_request', 'core_feature_request'];
    
    const label = CATEGORY_FRIENDLY_NAMES[classification] || classification;
    
    let mainBadge;
    if (bugCategories.includes(classification)) {
      mainBadge = <span className="inline-flex items-center gap-1 px-2 py-0.5 whitespace-nowrap rounded text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20"><Bug className="w-3 h-3" /> {label}</span>;
    } else if (featureCategories.includes(classification)) {
      mainBadge = <span className="inline-flex items-center gap-1 px-2 py-0.5 whitespace-nowrap rounded text-[10px] font-semibold bg-chart-2/10 text-chart-2 border border-chart-2/20"><Lightbulb className="w-3 h-3" /> {label}</span>;
    } else {
      mainBadge = <span className="inline-flex items-center gap-1 px-2 py-0.5 whitespace-nowrap rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border shadow-sm"><CheckCircle2 className="w-3 h-3" /> {label}</span>;
    }

    return (
      <div className="flex flex-col items-start gap-1.5">
        {mainBadge}
      </div>
    );
  };

  const getRiskDetails = (risk: number) => {
    if (risk >= 0.5) return { text: 'High Support Friction', color: 'bg-destructive/10 text-destructive border-destructive/20', show: true };
    if (risk >= 0.3) return { text: 'Medium Support Friction', color: 'bg-chart-4/10 text-chart-4 border-chart-4/20', show: true };
    return { text: 'Low Support Friction', color: 'bg-secondary/80 text-muted-foreground border-border/50', show: false };
  };

  const renderEscalationRisk = (risk: number) => {
    const { text, color } = getRiskDetails(risk);
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${color} cursor-help`}>
            {text.replace(' Support Friction', '')} ({Math.round(risk * 100)}%)
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Composite score from reopens, handling time, back-and-forth count, and detected customer frustration.
        </TooltipContent>
      </Tooltip>
    );
  };

  let panelTitle = activeCategory === 'all' 
    ? (filterTitle || 'All Signals') 
    : CATEGORY_FRIENDLY_NAMES[activeCategory] || activeCategory;
    
  if (activeCategory === 'cross_tagged_engineering') {
    panelTitle = 'Also flagged from Support';
  }

  const showClassification = activeCategory === 'all' || activeCategory === 'cross_tagged_engineering' || activeCategory === 'cross_tagged_product_quality';

  return (
    <div className={`w-full flex flex-col ${isModal ? '' : 'bg-card border-2 border-border shadow-sm rounded-xl overflow-hidden'}`}>
      <div className={`flex flex-col gap-4 md:flex-row md:items-center justify-between ${isModal ? 'pb-4' : 'p-6 border-b border-border'}`}>
        {!isModal && (
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">Evidence Panel: {panelTitle}</h2>
              {onClearFilter && (filterTitle || initialFilter) && (
                <button
                  onClick={onClearFilter}
                  className="px-2 py-1 text-xs font-medium bg-secondary text-muted-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Showing {filteredData.length} matching conversations</p>
          </div>
        )}
        
        <div className={`flex flex-wrap items-center gap-3 ${isModal ? 'w-full justify-end' : ''}`}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="w-[200px] h-9 pl-9 pr-3 rounded-md border-2 border-border shadow-sm bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-1">Sort:</span>
            {[
              { id: 'newest', label: 'Newest' },
              { id: 'oldest', label: 'Oldest' },
              { id: 'escalation_desc', label: 'Highest Friction' },
              { id: 'escalation_asc', label: 'Lowest Friction' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => handleFilterChange(setSortFilter, option.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  sortFilter === option.id 
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                    : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Headers */}
      <div className="flex items-center px-6 py-3 border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="flex-1 min-w-0 pr-4">Conversation</div>
        {showClassification && <div className="w-56 shrink-0 hidden sm:block pr-2">Classification</div>}
        {!isModal && (
          <div className="w-24 shrink-0 hidden lg:flex items-center justify-start font-semibold text-muted-foreground select-none">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors"
                  onClick={() => handleFilterChange(setSortFilter, sortFilter === 'escalation_desc' ? 'escalation_asc' : 'escalation_desc')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleFilterChange(setSortFilter, sortFilter === 'escalation_desc' ? 'escalation_asc' : 'escalation_desc');
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  Friction {sortFilter === 'escalation_desc' ? '↓' : sortFilter === 'escalation_asc' ? '↑' : ''}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                A computed score based on customer sentiment and urgency.
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        <div 
          className="w-32 shrink-0 hidden md:flex items-center justify-end mr-4 cursor-pointer hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded px-1 -ml-1 transition-colors"
          onClick={() => handleFilterChange(setSortFilter, sortFilter === 'newest' ? 'oldest' : 'newest')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleFilterChange(setSortFilter, sortFilter === 'newest' ? 'oldest' : 'newest');
            }
          }}
          tabIndex={0}
          role="columnheader"
          aria-sort={sortFilter === 'newest' ? 'descending' : sortFilter === 'oldest' ? 'ascending' : 'none'}
        >
          Created At {sortFilter === 'newest' ? '↓' : sortFilter === 'oldest' ? '↑' : ''}
        </div>
      </div>

      <div className="flex-1 divide-y divide-border/50">
        {filteredData.length === 0 ? (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground">No conversations match your criteria.</p>
          </div>
        ) : (
          filteredData.map((conv, idx) => {
            const rawBody = conv.source.body ? conv.source.body.replace(/<[^>]*>?/gm, ' ').trim() : '';
            const cleanSubject = conv.source.subject ? conv.source.subject.replace(/<[^>]*>?/gm, ' ').trim() : '';
            const fallbackTitle = rawBody.length > 60 ? rawBody.substring(0, 60) + '...' : rawBody;
            const displayTitle = conv.title || conv.custom_attributes?.['AI Title'] as string || fallbackTitle || 'Untitled Conversation';
            const displaySubject = cleanSubject || (rawBody.length > 80 ? rawBody.substring(0, 80) + '...' : rawBody) || 'No description provided.';
            
            const isExpanded = expandedConvId === conv.id;
            const hasFrustration = hasConversationFrustration(conv);
            const riskBadge = getRiskDetails(conv.escalationRisk);

            return (
              <div key={conv.id || idx} className="flex flex-col">
                <div 
                  onClick={() => setExpandedConvId(isExpanded ? null : conv.id)}
                  className={`flex items-center px-6 py-4 transition-colors hover:bg-secondary/20 cursor-pointer ${isExpanded ? 'bg-secondary/10' : ''} border-l-4 border-l-transparent`}
                >
                  <div className="flex-1 min-w-0 pr-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{displayTitle}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">{displaySubject}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 min-h-[22px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded border border-border cursor-help">
                            <MessageSquareWarning className="w-3 h-3" />
                            {(conv.conversation_parts?.conversation_parts || []).filter(p => p.part_type === 'comment').length} turns
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          The total number of back-and-forth messages (comments) in this conversation.
                        </TooltipContent>
                      </Tooltip>
                      {hasFrustration && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 cursor-help">
                              <AlertTriangle className="w-3 h-3" />
                              Frustrated Response
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Detected via NLP matching negative sentiment keywords or phrases (e.g., unacceptable, frustrated, scam).
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {!isModal && riskBadge.show && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded border ${riskBadge.color} cursor-help`}>
                              <AlertCircle className="w-3 h-3" />
                              {riskBadge.text}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Composite score from reopens, handling time, back-and-forth count, and detected customer frustration.
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {conv.is_dual_intent && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 cursor-help">
                              <Split className="w-3 h-3" />
                              Dual Intent
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            This conversation contains keywords matching multiple distinct categories or teams.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  
                  {showClassification && (
                    <div className="w-56 shrink-0 hidden sm:block pr-2">
                      {getClassificationBadge(conv.classification)}
                    </div>
                  )}
                  
                  {!isModal && (
                    <div className="w-24 shrink-0 hidden lg:flex items-center justify-start">
                      {renderEscalationRisk(conv.escalationRisk)}
                    </div>
                  )}
                  
                  <div className="w-32 shrink-0 hidden md:flex items-center justify-end gap-2 text-sm text-muted-foreground mr-4">
                    {formatPT(conv.created_at, "MMM d, HH:mm 'PST'")}
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-6 bg-muted/15 border-t border-b border-border/50 shrink-0">
                    <ConversationThread conversation={conv} viewContext="engineering" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
