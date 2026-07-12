"use client";

import { useState, useMemo, useEffect } from 'react';
import { PulseConversation } from '@/lib/types';
import { AlertCircle, Search, ChevronLeft, ChevronRight, MessageSquareWarning, AlertTriangle, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import ConversationThread from './ConversationThread';
import { formatPT } from '@/lib/utils/timezone';
import { computeDatasetThresholds, computeEscalationRisk, hasConversationFrustration } from '@/lib/analytics/aggregations';

export default function ConversationList({ 
  data, 
  initialFilter,
  filterTitle,
  onClearFilter,
  isModal = false
}: { 
  data: PulseConversation[],
  initialFilter?: { status?: string, sort?: string },
  filterTitle?: string,
  onClearFilter?: () => void,
  isModal?: boolean
}) {
  const [search, setSearch] = useState('');
  const [sortFilter, setSortFilter] = useState<string>(initialFilter?.sort || 'newest');
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);

  useEffect(() => {
    if (initialFilter?.sort) {
      setSortFilter(initialFilter.sort);
    } else {
      setSortFilter('newest');
    }
    setSearch('');
    setExpandedConvId(null);
  }, [initialFilter?.sort, filterTitle]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setExpandedConvId(null);
  };

  const thresholds = useMemo(() => computeDatasetThresholds(data), [data]);

  const filteredData = useMemo(() => {
    return data.filter(conv => {
      // Search Filter (checks title, subject, and body)
      if (search.trim() !== '') {
        const query = search.toLowerCase();
        const title = (conv.title || '').toLowerCase();
        const subject = (conv.source.subject || '').toLowerCase();
        const body = (conv.source.body || '').toLowerCase();
        
        if (!title.includes(query) && !subject.includes(query) && !body.includes(query)) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => {
      if (sortFilter === 'newest') return b.created_at - a.created_at;
      if (sortFilter === 'oldest') return a.created_at - b.created_at;
      if (sortFilter === 'time_to_admin_reply_desc') return (b.statistics?.time_to_admin_reply || 0) - (a.statistics?.time_to_admin_reply || 0);
      if (sortFilter === 'reopens_desc') return (b.statistics?.count_reopens || 0) - (a.statistics?.count_reopens || 0);
      if (sortFilter === 'csat_asc') return (a.conversation_rating?.rating || 6) - (b.conversation_rating?.rating || 6); // 6 puts unrated at bottom
      if (sortFilter === 'escalation_desc') return computeEscalationRisk(b, thresholds) - computeEscalationRisk(a, thresholds);
      if (sortFilter === 'back_and_forth_desc') return (b.statistics?.count_conversation_parts || 0) - (a.statistics?.count_conversation_parts || 0);
      return 0;
    });
  }, [data, search, sortFilter, thresholds]);

  const getRiskDetails = (risk: number) => {
    if (risk >= 0.5) return { text: 'High Support Friction', color: 'bg-destructive/10 text-destructive border-destructive/20', show: true };
    if (risk >= 0.3) return { text: 'Medium Support Friction', color: 'bg-chart-4/10 text-chart-4 border-chart-4/20', show: true };
    return { text: 'Low Support Friction', color: 'bg-secondary/80 text-muted-foreground border-border/50', show: false };
  };

  if (data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-card border-2 border-border shadow-sm rounded-xl">
        <p className="text-muted-foreground">No conversations found.</p>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col ${isModal ? '' : 'bg-card border-2 border-border shadow-sm rounded-xl overflow-hidden'}`}>
      <div className={`flex flex-col gap-4 md:flex-row md:items-center justify-between ${isModal ? 'pb-4' : 'p-6 border-b border-border'}`}>
        {!isModal && (
          <div className="shrink-0 flex flex-col gap-1.5">
            {filterTitle && onClearFilter && (
              <div className="flex items-start">
                <div className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-primary text-primary-foreground text-[11px] uppercase tracking-wider font-bold rounded-full shadow-md hover:shadow-lg transition-all">
                  <span className="truncate max-w-[200px] sm:max-w-xs">{filterTitle} ({data.length})</span>
                  <button 
                    onClick={onClearFilter}
                    className="p-0.5 hover:bg-background/20 rounded-full transition-colors flex items-center justify-center text-primary-foreground"
                    title="Clear filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold">Raw Conversations</h2>
              <p className="text-sm text-muted-foreground">Filter and paginate through the dataset</p>
            </div>
          </div>
        )}
        
        {/* Sort Pills (Center) */}
        <div className={`flex-1 flex justify-center ${isModal ? 'w-full justify-end' : ''}`}>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'newest', label: 'Newest' },
              { id: 'oldest', label: 'Oldest' },
              { id: 'escalation_desc', label: 'Highest Friction' },
              { id: 'time_to_admin_reply_desc', label: 'Longest Reply' },
              { id: 'reopens_desc', label: 'Most Reopens' },
              { id: 'back_and_forth_desc', label: 'Most Back-and-Forth' },
              { id: 'csat_asc', label: 'Lowest CSAT' }
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

        {/* Search (Right) */}
        {!isModal && (
          <div className="shrink-0 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search text..." 
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-48"
            />
          </div>
        )}
      </div>
      
      {/* Table Header */}
      <div className="flex items-center px-6 py-3 bg-secondary/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="flex-1 min-w-0 pr-4">Subject & Details</div>
        <div className="w-32 shrink-0 hidden sm:block">Status</div>
        <div 
          className="w-48 shrink-0 hidden md:block cursor-pointer hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded px-1 -ml-1 transition-colors"
          onClick={() => handleFilterChange(setSortFilter, sortFilter === 'newest' ? 'oldest' : 'newest')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleFilterChange(setSortFilter, sortFilter === 'newest' ? 'oldest' : 'newest');
            }
          }}
          tabIndex={0}
          role="columnheader"
          aria-sort={sortFilter === 'newest' ? 'descending' : 'ascending'}
        >
          Created At {sortFilter === 'newest' ? '↓' : '↑'}
        </div>
      </div>

      <div className="flex-1 divide-y divide-border/50">
        {filteredData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No conversations match the current filters.
          </div>
        ) : (
          filteredData.map((conv, idx) => {
            const rawBody = conv.source.body ? conv.source.body.replace(/<[^>]*>?/gm, ' ').trim() : '';
            const cleanSubject = conv.source.subject ? conv.source.subject.replace(/<[^>]*>?/gm, ' ').trim() : '';
            const fallbackTitle = rawBody.length > 60 ? rawBody.substring(0, 60) + '...' : rawBody;
            const displayTitle = conv.title || (conv.custom_attributes?.['AI Title'] as string) || fallbackTitle || 'Untitled Conversation';
            const displaySubject = cleanSubject || (rawBody.length > 80 ? rawBody.substring(0, 80) + '...' : rawBody) || 'No description provided.';
            
            const isExpanded = expandedConvId === conv.id;
            const risk = computeEscalationRisk(conv, thresholds);
            const riskBadge = getRiskDetails(risk);
            const hasFrustration = hasConversationFrustration(conv);
            
            return (
              <div key={conv.id || idx} className="flex flex-col">
                <div 
                  onClick={() => setExpandedConvId(isExpanded ? null : conv.id)}
                  className={`flex items-center px-6 py-4 transition-colors hover:bg-secondary/20 cursor-pointer ${isExpanded ? 'bg-secondary/10' : ''}`}
                >
                  <div className="flex-1 min-w-0 pr-4 space-y-1">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">
                      {displayTitle}
                    </p>
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
                              {riskBadge.text} ({Math.round(risk * 100)}%)
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Composite score from reopens, handling time, back-and-forth count, and detected customer frustration.
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {conv.llm_classification?.churn_risk_1_to_10 >= 7 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/30 cursor-help flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              High Churn Risk
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            AI detected a {conv.llm_classification.churn_risk_1_to_10}/10 risk of subscription cancellation.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    
                    {/* Mobile only Status/Date */}
                    <div className="flex sm:hidden items-center gap-3 mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        conv.state === 'open' ? 'text-chart-4 bg-chart-4/10 border-chart-4/20' :
                        conv.state === 'closed' ? 'text-chart-3 bg-chart-3/10 border-chart-3/20' :
                        'text-muted-foreground bg-muted/50 border-border'
                      }`}>
                        {conv.state}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatPT(conv.created_at, "MMM d, yyyy 'PST'")}
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-32 shrink-0 hidden sm:block">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                      conv.state === 'open' ? 'text-chart-4 bg-chart-4/10 border-chart-4/20' :
                      conv.state === 'closed' ? 'text-chart-3 bg-chart-3/10 border-chart-3/20' :
                      'text-muted-foreground bg-muted/50 border-border'
                    }`}>
                      {conv.state}
                    </span>
                  </div>
                  
                  <div className="w-48 shrink-0 hidden md:flex items-center gap-2">
                    {conv.statistics?.count_reopens > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center cursor-help">
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Reopened
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {formatPT(conv.created_at, "MMM d, yyyy HH:mm 'PST'")}
                    </span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-6 bg-muted/15 border-t border-b border-border/50 shrink-0">
                    <ConversationThread conversation={conv} viewContext="support" />
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
