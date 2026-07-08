"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { AlertCircle, Search, ChevronLeft, ChevronRight, MessageSquareWarning, AlertTriangle } from 'lucide-react';
import ConversationThread from './ConversationThread';
import { formatPT } from '@/lib/utils/timezone';
import { computeDatasetThresholds, computeEscalationRisk, hasConversationFrustration } from '@/lib/analytics/aggregations';

export default function ConversationList({ 
  data, 
  initialFilter,
  isModal = false
}: { 
  data: PulseConversation[],
  initialFilter?: { status?: string, sort?: string },
  isModal?: boolean
}) {
  const [search, setSearch] = useState('');
  const [sortFilter, setSortFilter] = useState<string>(initialFilter?.sort || 'escalation_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Reset page when filters change
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setCurrentPage(1);
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

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getRiskDetails = (risk: number) => {
    if (risk >= 0.5) return { text: 'High Risk', color: 'bg-destructive/10 text-destructive border-destructive/20' };
    if (risk >= 0.3) return { text: 'Medium Risk', color: 'bg-chart-4/10 text-chart-4 border-chart-4/20' };
    return { text: 'Low Risk', color: 'bg-secondary/80 text-muted-foreground border-border/50' };
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
          <div>
            <h2 className="text-lg font-semibold">Raw Conversations</h2>
            <p className="text-sm text-muted-foreground">Filter and paginate through the dataset</p>
          </div>
        )}
        
        {/* Filters */}
        <div className={`flex flex-wrap items-center gap-3 ${isModal ? 'w-full justify-end' : ''}`}>
          {!isModal && (
            <div className="relative">
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
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <select 
              value={sortFilter}
              onChange={(e) => handleFilterChange(setSortFilter, e.target.value)}
              className="text-sm bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="escalation_desc">Highest Risk</option>
              <option value="time_to_admin_reply_desc">Longest Reply Time</option>
              <option value="reopens_desc">Most Reopens</option>
              <option value="back_and_forth_desc">Most Back-and-Forth</option>
              <option value="csat_asc">Lowest CSAT</option>
            </select>
          </div>
        </div>
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

      {/* List */}
      <div className="flex-1 overflow-y-auto max-h-[600px] scrollbar-thin divide-y divide-border/50">
        {paginatedData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No conversations match the current filters.
          </div>
        ) : (
          paginatedData.map((conv, idx) => {
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
                      {!isModal && (
                        <span className="relative group/risk inline-flex items-center">
                          <span className={`text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded border ${riskBadge.color} cursor-help`}>
                            <AlertCircle className="w-3 h-3" />
                            {riskBadge.text} ({Math.round(risk * 100)}%)
                          </span>
                          <span className="absolute bottom-full mb-2 left-0 w-48 p-2 bg-popover text-popover-foreground text-[10px] leading-tight font-medium rounded opacity-0 group-hover/risk:opacity-100 transition-opacity duration-200 group-hover/risk:delay-300 pointer-events-none z-50 border border-border shadow-md text-center whitespace-normal normal-case">
                            Composite score from reopens, handling time, back-and-forth count, and detected customer frustration.
                          </span>
                        </span>
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
                      <div className="group relative flex items-center">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border shadow-sm">
                          Reopened
                        </div>
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {formatPT(conv.created_at, "MMM d, yyyy HH:mm 'PST'")}
                    </span>
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
            className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-2 text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
