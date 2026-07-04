"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { format, fromUnixTime, isAfter, subDays } from 'date-fns';
import { AlertCircle, Search, ChevronLeft, ChevronRight, X, FileJson, ChevronDown, ChevronUp } from 'lucide-react';
import ConversationThreadModal from './ConversationThreadModal';

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
  const [sortFilter, setSortFilter] = useState<string>(initialFilter?.sort || 'newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedConversation, setSelectedConversation] = useState<PulseConversation | null>(null);
  const [rawLogModalData, setRawLogModalData] = useState<PulseConversation | null>(null);
  const itemsPerPage = 50;

  // Reset page when filters change
  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

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
      return 0;
    });
  }, [data, search, sortFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-card border border-border rounded-xl">
        <p className="text-muted-foreground">No conversations found.</p>
      </div>
    );
  }

  return (
    <>
    <div className={`w-full flex flex-col ${isModal ? '' : 'bg-card border border-border rounded-xl overflow-hidden'}`}>
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
        </div>
      </div>
      
      {/* Table Header */}
      <div className="flex items-center px-6 py-3 bg-secondary/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
      <div className="flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
        {paginatedData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No conversations match the current filters.
          </div>
        ) : (
          paginatedData.map((conv, idx) => {
            const rawBody = conv.source.body ? conv.source.body.replace(/<[^>]*>?/gm, ' ').trim() : '';
            const fallbackTitle = rawBody.length > 60 ? rawBody.substring(0, 60) + '...' : rawBody;
            const displayTitle = conv.title || (conv.custom_attributes?.['AI Title'] as string) || fallbackTitle || 'Untitled Conversation';
            const displaySubject = conv.source.subject || (rawBody.length > 80 ? rawBody.substring(0, 80) + '...' : rawBody) || 'No description provided.';
            
            
            return (
              <div key={conv.id || idx} className="border-b border-border transition-colors">
                <div 
                  onClick={() => setSelectedConversation(conv)}
                  className={`flex items-center px-6 py-4 transition-colors hover:bg-secondary/20 cursor-pointer`}
                >
                  <div className="flex-1 min-w-0 pr-4 space-y-1">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">
                      {displayTitle}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{displaySubject}</p>
                    
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
                        {format(fromUnixTime(conv.created_at), 'MMM d, yyyy')}
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
                  
                  <div className="w-48 shrink-0 hidden md:flex items-center gap-2 relative">
                    {conv.statistics?.count_reopens > 0 && (
                      <div className="group relative flex items-center">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border shadow-sm">
                          Reopened
                        </div>
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground mr-4">
                      {format(fromUnixTime(conv.created_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
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

      {/* Raw JSON Modal */}
      {rawLogModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card w-full max-w-4xl max-h-[80vh] flex flex-col rounded-xl shadow-lg border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileJson className="w-5 h-5 text-chart-1" /> Raw Log
              </h2>
              <button 
                onClick={() => setRawLogModalData(null)}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
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

      {/* Conversation Thread Modal */}
      <ConversationThreadModal 
        isOpen={!!selectedConversation}
        onClose={() => setSelectedConversation(null)}
        conversation={selectedConversation}
        onViewRawLog={(conv) => {
          setRawLogModalData(conv);
          // Keep the thread modal open, raw log modal will just stack above it due to z-index.
        }}
      />
    </>
  );
}
