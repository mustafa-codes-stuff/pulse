"use client";

import { useState, useMemo, useEffect } from 'react';
import { PulseConversation } from '@/lib/types';
import { Search, ChevronLeft, ChevronRight, Bug, Lightbulb, CheckCircle2, MessageSquareWarning, AlertTriangle } from 'lucide-react';
import { classifyConversation } from '@/lib/nlp/heuristics';
import { computeDatasetThresholds, computeEscalationRisk, CATEGORY_FRIENDLY_NAMES, hasConversationFrustration } from '@/lib/analytics/aggregations';
import ConversationThread from './ConversationThread';
import { formatPT } from '@/lib/utils/timezone';

export default function EngineeringConversationList({ 
  data, 
  activeCategory = 'all',
  isModal = false
}: { 
  data: PulseConversation[],
  activeCategory?: string,
  isModal?: boolean
}) {
  const [search, setSearch] = useState('');
  const [sortFilter, setSortFilter] = useState<string>('escalation_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Reset pagination when category changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedConvId(null);
  }, [activeCategory]);

  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
    setExpandedConvId(null);
  };

  const thresholds = useMemo(() => computeDatasetThresholds(data), [data]);

  const processedData = useMemo(() => {
    return data.map(conv => {
      const { category: classification, confidence } = classifyConversation(conv.title || '', conv.source.body);
      const hasAttachments = !!conv.custom_attributes?.['Has attachments'] || (conv.source.attachments && conv.source.attachments.length > 0);
      const escalationRisk = computeEscalationRisk(conv, thresholds);
      return { ...conv, classification, confidence, hasAttachments, escalationRisk };
    });
  }, [data, thresholds]);

  const filteredData = useMemo(() => {
    return processedData.filter(conv => {
      if (activeCategory !== 'all') {
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
      if (sortFilter === 'escalation_desc') return (b as any).escalationRisk - (a as any).escalationRisk;
      if (sortFilter === 'escalation_asc') return (a as any).escalationRisk - (b as any).escalationRisk;
      return 0;
    });
  }, [processedData, search, activeCategory, sortFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getClassificationBadge = (classification: string, confidence?: string) => {
    const bugCategories = ['image_quality_technical', 'generation_accuracy', 'attribute_mismatch', 'auth_access', 'upload_flow', 'payment_checkout', 'other_bugs'];
    const featureCategories = ['customization_request', 'core_feature_request'];
    
    const label = CATEGORY_FRIENDLY_NAMES[classification] || classification;
    const isLowConf = confidence === 'low';
    
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
        {isLowConf && (
          <span className="relative group/conf inline-flex items-center gap-1 px-2 py-0.5 whitespace-nowrap rounded text-[10px] font-semibold bg-secondary/80 text-muted-foreground border border-border/50 cursor-help">
            <span className="font-bold opacity-70">?</span> Low Confidence
            <span className="absolute bottom-full mb-2 left-0 w-32 p-1.5 bg-popover text-popover-foreground text-xs font-medium rounded opacity-0 group-hover/conf:opacity-100 transition-opacity pointer-events-none z-50 border border-border shadow-md text-center whitespace-normal leading-tight normal-case tracking-normal">
              Low confidence classification
            </span>
          </span>
        )}
      </div>
    );
  };

  const renderEscalationRisk = (risk: number) => {
    let label = 'Low';
    let color = 'text-muted-foreground bg-secondary/80 border-border/50';
    if (risk >= 0.5) {
      label = 'High';
      color = 'text-destructive bg-destructive/10 border-destructive/20';
    } else if (risk >= 0.3) {
      label = 'Medium';
      color = 'text-chart-4 bg-chart-4/10 border-chart-4/20';
    }
    
    return (
      <div className="relative group/risk inline-flex items-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${color} cursor-help`}>
          {label} ({Math.round(risk * 100)}%)
        </span>
        <span className="absolute bottom-full mb-2 right-0 w-48 p-2 bg-popover text-popover-foreground text-[10px] leading-tight font-medium rounded opacity-0 group-hover/risk:opacity-100 transition-opacity duration-200 group-hover/risk:delay-300 pointer-events-none z-50 border border-border shadow-md text-center whitespace-normal normal-case">
          Composite score from reopens, handling time, back-and-forth count, and detected customer frustration.
        </span>
      </div>
    );
  };

  const panelTitle = activeCategory === 'all' 
    ? 'All Signals' 
    : CATEGORY_FRIENDLY_NAMES[activeCategory] || activeCategory;

  return (
    <div className={`w-full flex flex-col ${isModal ? '' : 'bg-card border-2 border-border shadow-sm rounded-xl overflow-hidden'}`}>
      <div className={`flex flex-col gap-4 md:flex-row md:items-center justify-between ${isModal ? 'pb-4' : 'p-6 border-b border-border'}`}>
        {!isModal && (
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">Evidence Panel: {panelTitle}</h2>
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

          <div className="flex items-center gap-2 border border-border rounded-md bg-background p-1">
            <select 
              value={sortFilter}
              onChange={(e) => handleFilterChange(setSortFilter, e.target.value)}
              className="h-7 bg-transparent text-sm focus:outline-none px-2 text-muted-foreground"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="escalation_desc">Highest Risk</option>
              <option value="escalation_asc">Lowest Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Headers */}
      <div className="flex items-center px-6 py-3 border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="flex-1 min-w-0 pr-4">Conversation</div>
        <div className="w-56 shrink-0 hidden sm:block pr-2">Classification</div>
        {!isModal && (
          <div 
            className="w-24 shrink-0 hidden lg:flex items-center justify-start font-semibold text-muted-foreground select-none relative group/tooltip"
          >
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
              aria-sort={sortFilter === 'escalation_desc' ? 'descending' : sortFilter === 'escalation_asc' ? 'ascending' : 'none'}
            >
              Risk Level {sortFilter === 'escalation_desc' ? '↓' : sortFilter === 'escalation_asc' ? '↑' : ''}
            </div>
            <div className="absolute top-full mt-2 right-0 w-48 p-2 bg-popover text-popover-foreground text-xs font-medium rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 group-hover/tooltip:delay-300 pointer-events-none z-10 border border-border shadow-md text-center">
              A computed score based on customer sentiment and urgency.
            </div>
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

      {/* List Body */}
      <div className="flex-1 overflow-y-auto min-h-[400px] divide-y divide-border/50">
        {paginatedData.length === 0 ? (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground">No conversations match your criteria.</p>
          </div>
        ) : (
          paginatedData.map((conv, idx) => {
            const rawBody = conv.source.body ? conv.source.body.replace(/<[^>]*>?/gm, ' ').trim() : '';
            const cleanSubject = conv.source.subject ? conv.source.subject.replace(/<[^>]*>?/gm, ' ').trim() : '';
            const fallbackTitle = rawBody.length > 60 ? rawBody.substring(0, 60) + '...' : rawBody;
            const displayTitle = conv.title || conv.custom_attributes?.['AI Title'] as string || fallbackTitle || 'Untitled Conversation';
            const displaySubject = cleanSubject || (rawBody.length > 80 ? rawBody.substring(0, 80) + '...' : rawBody) || 'No description provided.';
            
            const isExpanded = expandedConvId === conv.id;
            const hasFrustration = hasConversationFrustration(conv);

            return (
              <div key={conv.id || idx} className="flex flex-col">
                <div 
                  onClick={() => setExpandedConvId(isExpanded ? null : conv.id)}
                  className={`flex items-center px-6 py-4 transition-colors hover:bg-secondary/20 cursor-pointer ${isExpanded ? 'bg-secondary/10' : ''}`}
                >
                  <div className="flex-1 min-w-0 pr-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{displayTitle}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">{displaySubject}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 min-h-[22px]">
                      <span className="relative group/turns inline-flex items-center">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded border border-border cursor-help">
                          <MessageSquareWarning className="w-3 h-3" />
                          {(conv.conversation_parts?.conversation_parts || []).filter(p => p.part_type === 'comment').length} turns
                        </span>
                        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 p-2 bg-popover text-popover-foreground text-[10px] leading-tight font-medium rounded opacity-0 group-hover/turns:opacity-100 transition-opacity duration-200 group-hover/turns:delay-300 pointer-events-none z-50 border border-border shadow-md text-center whitespace-normal normal-case">
                          The total number of back-and-forth messages (comments) in this conversation.
                        </span>
                      </span>
                      {hasFrustration && (
                        <span className="text-[10px] font-bold text-destructive flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
                          <AlertTriangle className="w-3 h-3" />
                          Frustrated Response
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-56 shrink-0 hidden sm:block pr-2">
                    {getClassificationBadge(conv.classification, conv.confidence)}
                  </div>
                  
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
                    <ConversationThread conversation={conv} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-border flex items-center justify-between bg-secondary/10 shrink-0">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{Math.min(1 + (currentPage - 1) * itemsPerPage, filteredData.length)}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="font-medium text-foreground">{filteredData.length}</span> entries
        </p>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-2 text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
