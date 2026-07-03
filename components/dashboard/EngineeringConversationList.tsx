"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { format, fromUnixTime } from 'date-fns';
import { AlertCircle, Search, Filter, ChevronLeft, ChevronRight, X, FileJson, Bug, Lightbulb, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { classifyConversation } from '@/lib/nlp/heuristics';

export default function EngineeringConversationList({ 
  data, 
  initialFilter 
}: { 
  data: PulseConversation[],
  initialFilter?: { classification?: string, attachment?: string, sort?: string }
}) {
  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<string>(initialFilter?.classification || 'all');
  const [attachmentFilter, setAttachmentFilter] = useState<string>(initialFilter?.attachment || 'all');
  const [sortFilter, setSortFilter] = useState<string>(initialFilter?.sort || 'newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rawLogModalData, setRawLogModalData] = useState<PulseConversation | null>(null);
  const itemsPerPage = 50;

  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const processedData = useMemo(() => {
    return data.map(conv => {
      const classification = classifyConversation(conv.title || '', conv.source.body);
      const hasAttachments = !!conv.custom_attributes?.['Has attachments'] || (conv.source.attachments && conv.source.attachments.length > 0);
      return { ...conv, classification, hasAttachments };
    });
  }, [data]);

  const filteredData = useMemo(() => {
    return processedData.filter(conv => {
      if (classificationFilter !== 'all' && conv.classification !== classificationFilter) return false;
      
      if (attachmentFilter === 'with') {
        if (!conv.hasAttachments) return false;
      } else if (attachmentFilter === 'without') {
        if (conv.hasAttachments) return false;
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
      if (sortFilter === 'complexity_desc') return (b.statistics?.count_conversation_parts || 0) - (a.statistics?.count_conversation_parts || 0);
      if (sortFilter === 'complexity_asc') return (a.statistics?.count_conversation_parts || 0) - (b.statistics?.count_conversation_parts || 0);
      return 0;
    });
  }, [processedData, search, classificationFilter, attachmentFilter, sortFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getClassificationBadge = (classification: string) => {
    switch(classification) {
      case 'bug': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20"><Bug className="w-3 h-3" /> Bug</span>;
      case 'feature_request': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-chart-2/10 text-chart-2 border border-chart-2/20"><Lightbulb className="w-3 h-3" /> Feature</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"><CheckCircle2 className="w-3 h-3" /> Standard</span>;
    }
  };

  return (
    <>
      <div className="w-full bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">Engineering Triage List</h2>
            <p className="text-sm text-muted-foreground mt-1">Filter technical issues, bugs, and complex tickets</p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search logs..." 
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="w-[200px] h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
              />
            </div>
            
            <div className="flex items-center gap-2 border border-border rounded-md bg-background p-1">
              <Filter className="w-4 h-4 text-muted-foreground ml-2" />
              <select 
                value={classificationFilter}
                onChange={(e) => handleFilterChange(setClassificationFilter, e.target.value)}
                className="h-7 bg-transparent text-sm focus:outline-none pr-2 text-muted-foreground"
              >
                <option value="all">All Types</option>
                <option value="bug">Bugs</option>
                <option value="feature_request">Features</option>
                <option value="other">Standard</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border border-border rounded-md bg-background p-1">
              <select 
                value={attachmentFilter}
                onChange={(e) => handleFilterChange(setAttachmentFilter, e.target.value)}
                className="h-7 bg-transparent text-sm focus:outline-none px-2 text-muted-foreground"
              >
                <option value="all">Any Attachments</option>
                <option value="with">Has Attachments</option>
                <option value="without">No Attachments</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border border-border rounded-md bg-background p-1">
              <select 
                value={sortFilter}
                onChange={(e) => handleFilterChange(setSortFilter, e.target.value)}
                className="h-7 bg-transparent text-sm focus:outline-none px-2 text-muted-foreground"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="complexity_desc">Most Complex</option>
                <option value="complexity_asc">Least Complex</option>
              </select>
            </div>
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto min-h-[400px]">
          {paginatedData.length === 0 ? (
            <div className="w-full h-full min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">No conversations match your criteria.</p>
            </div>
          ) : (
            paginatedData.map((conv, idx) => {
              const displayTitle = conv.title || conv.custom_attributes?.['AI Title'] as string || 'Untitled Conversation';
              const rawBody = conv.source.body ? conv.source.body.replace(/<[^>]*>?/gm, ' ').trim() : '';
              const displaySubject = conv.source.subject || (rawBody.length > 80 ? rawBody.substring(0, 80) + '...' : rawBody) || 'No description provided.';
              
              const isExpanded = expandedId === (conv.id || String(idx));
              
              return (
                <div key={conv.id || idx} className="border-b border-border transition-colors">
                  <div 
                    className={`flex items-center px-6 py-4 transition-colors hover:bg-secondary/10 ${isExpanded ? 'bg-secondary/5' : ''}`}
                  >
                    <div className="flex-1 min-w-0 pr-4 space-y-1">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{displayTitle}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{displaySubject}</p>
                    </div>
                    
                    <div className="w-28 shrink-0 hidden sm:block">
                      {getClassificationBadge(conv.classification)}
                    </div>

                    <div className="w-24 shrink-0 hidden lg:flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground uppercase font-medium">Complexity</span>
                      <span className={`text-sm font-semibold ${conv.statistics?.count_conversation_parts > 5 ? 'text-chart-1' : 'text-foreground'}`}>
                        {conv.statistics?.count_conversation_parts || 0} msgs
                      </span>
                    </div>
                    
                    <div className="w-32 shrink-0 hidden md:flex items-center justify-end gap-2 text-sm text-muted-foreground mr-4">
                      {format(fromUnixTime(conv.created_at), 'MMM d, HH:mm')}
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : (conv.id || String(idx)));
                      }}
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-6 py-4 bg-secondary/10 border-t border-border/50 text-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-foreground/80">Conversation Body</h4>
                        <div className="flex items-center gap-3">
                          {conv.hasAttachments && (
                            <span className="text-xs font-medium text-chart-4 bg-chart-4/10 px-2 py-1 rounded">Has Attachments</span>
                          )}
                          <button 
                            onClick={() => setRawLogModalData(conv)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors cursor-pointer"
                          >
                            <FileJson className="w-4 h-4" /> View Raw Log
                          </button>
                        </div>
                      </div>
                      <div 
                        className="text-sm text-foreground/90 whitespace-pre-wrap break-words bg-background p-4 rounded-lg border border-border"
                        dangerouslySetInnerHTML={{ __html: conv.source.body || 'No description provided.' }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-secondary/10">
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

      {/* Raw JSON Modal */}
      {rawLogModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card w-full max-w-4xl max-h-[80vh] flex flex-col rounded-xl shadow-lg border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileJson className="w-5 h-5 text-chart-1" /> Raw Log: {rawLogModalData.id}
              </h2>
              <button 
                onClick={() => setRawLogModalData(null)}
                className="p-2 rounded-full hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 min-h-0 bg-secondary/30">
              <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap break-words bg-background p-4 rounded-lg border border-border shadow-inner">
                {JSON.stringify(rawLogModalData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
