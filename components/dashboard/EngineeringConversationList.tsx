"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { format, fromUnixTime } from 'date-fns';
import { AlertCircle, Search, Filter, ChevronLeft, ChevronRight, X, Bug, Lightbulb, CheckCircle2, MessageSquareWarning } from 'lucide-react';
import { classifyConversation } from '@/lib/nlp/heuristics';
import { computeDatasetThresholds, computeEscalationRisk, CATEGORY_FRIENDLY_NAMES } from '@/lib/analytics/aggregations';
import ConversationThreadModal from './ConversationThreadModal';

export default function EngineeringConversationList({ 
  data, 
  initialFilter,
  isModal = false
}: { 
  data: PulseConversation[],
  initialFilter?: { classification?: string, attachment?: string, sort?: string },
  isModal?: boolean
}) {
  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<string>(initialFilter?.classification || 'all');
  const [sortFilter, setSortFilter] = useState<string>(initialFilter?.sort || 'newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedConversation, setSelectedConversation] = useState<PulseConversation | null>(null);
  const itemsPerPage = 10;

  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const thresholds = useMemo(() => computeDatasetThresholds(data), [data]);

  const processedData = useMemo(() => {
    return data.map(conv => {
      const classification = classifyConversation(conv.title || '', conv.source.body);
      const hasAttachments = !!conv.custom_attributes?.['Has attachments'] || (conv.source.attachments && conv.source.attachments.length > 0);
      const escalationRisk = computeEscalationRisk(conv, thresholds);
      return { ...conv, classification, hasAttachments, escalationRisk };
    });
  }, [data, thresholds]);

  const filteredData = useMemo(() => {
    return processedData.filter(conv => {
      if (classificationFilter !== 'all') {
        const bugCategories = ['rendering_quality', 'auth_access', 'upload_flow', 'payment_checkout', 'other_bugs'];
        const featureCategories = ['customization_request', 'core_feature_request'];
        const supportCategories = ['refund_request', 'subscription_cancel', 'pre_sales_info', 'delivery_status', 'system_automated'];

        if (classificationFilter === 'group_bugs') {
          if (!bugCategories.includes(conv.classification)) return false;
        } else if (classificationFilter === 'group_features') {
          if (!featureCategories.includes(conv.classification)) return false;
        } else if (classificationFilter === 'group_support') {
          if (!supportCategories.includes(conv.classification)) return false;
        } else {
          if (conv.classification !== classificationFilter) return false;
        }
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
  }, [processedData, search, classificationFilter, sortFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getClassificationBadge = (classification: string) => {
    const bugCategories = ['rendering_quality', 'auth_access', 'upload_flow', 'payment_checkout', 'other_bugs'];
    const featureCategories = ['customization_request', 'core_feature_request'];
    
    const label = CATEGORY_FRIENDLY_NAMES[classification] || classification;
    
    if (bugCategories.includes(classification)) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 whitespace-nowrap rounded text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20"><Bug className="w-3 h-3" /> {label}</span>;
    } else if (featureCategories.includes(classification)) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 whitespace-nowrap rounded text-[10px] font-semibold bg-chart-2/10 text-chart-2 border border-chart-2/20"><Lightbulb className="w-3 h-3" /> {label}</span>;
    } else {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 whitespace-nowrap rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border"><CheckCircle2 className="w-3 h-3" /> {label}</span>;
    }
  };

  return (
    <>
      <div className={`w-full flex flex-col ${isModal ? '' : 'bg-card border border-border rounded-xl overflow-hidden'}`}>
        <div className={`flex flex-col gap-4 md:flex-row md:items-center justify-between ${isModal ? 'pb-4' : 'p-6 border-b border-border'}`}>
          {!isModal && (
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">Engineering Triage List</h2>
              <p className="text-sm text-muted-foreground mt-1">Filter technical issues, bugs, and complex tickets</p>
            </div>
          )}
          
          {/* Filters */}
          <div className={`flex flex-wrap items-center gap-3 ${isModal ? 'w-full justify-end' : ''}`}>
            {!isModal && (
              <>
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
                    <option value="all">All Categories</option>
                    <option value="group_bugs">All Bugs & Tech Issues</option>
                    <option value="group_features">All Feature Requests</option>
                    <option value="group_support">All Support Inquiries</option>
                    <optgroup label="Bugs & Tech Issues">
                      <option value="rendering_quality">Rendering & Image Quality</option>
                      <option value="auth_access">Login & Account Access</option>
                      <option value="upload_flow">Photo Upload Issues</option>
                      <option value="payment_checkout">Payment & Checkout Failures</option>
                      <option value="other_bugs">General Bugs & UI Issues</option>
                    </optgroup>
                    <optgroup label="Feature Requests">
                      <option value="customization_request">Customization Requests</option>
                      <option value="core_feature_request">Core Features & Formats</option>
                    </optgroup>
                    <optgroup label="Support Inquiries">
                      <option value="refund_request">Refund Requests</option>
                      <option value="subscription_cancel">Subscriptions & Cancellations</option>
                      <option value="pre_sales_info">Pre-sales & Pricing Info</option>
                      <option value="delivery_status">Delivery Status & ETAs</option>
                      <option value="system_automated">Automated System Spam</option>
                    </optgroup>
                  </select>
                </div>
              </>
            )}
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
          <div className="w-40 shrink-0 hidden sm:block">Classification</div>
          <div 
            className="w-24 shrink-0 hidden lg:flex items-end justify-end cursor-pointer hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded px-1 -mr-1 transition-colors"
            onClick={() => handleFilterChange(setSortFilter, sortFilter === 'escalation_desc' ? 'escalation_asc' : 'escalation_desc')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleFilterChange(setSortFilter, sortFilter === 'escalation_desc' ? 'escalation_asc' : 'escalation_desc');
              }
            }}
            tabIndex={0}
            role="columnheader"
            aria-sort={sortFilter === 'escalation_desc' ? 'descending' : sortFilter === 'escalation_asc' ? 'ascending' : 'none'}
          >
            Escalation {sortFilter === 'escalation_desc' ? '↓' : sortFilter === 'escalation_asc' ? '↑' : ''}
          </div>
          <div 
            className="w-32 shrink-0 hidden md:flex items-center justify-end mr-4 cursor-pointer hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded px-1 -mr-1 transition-colors"
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
        <div className="flex-1 overflow-y-auto min-h-[400px]">
          {paginatedData.length === 0 ? (
            <div className="w-full h-full min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">No conversations match your criteria.</p>
            </div>
          ) : (
            paginatedData.map((conv, idx) => {
              const rawBody = conv.source.body ? conv.source.body.replace(/<[^>]*>?/gm, ' ').trim() : '';
              const fallbackTitle = rawBody.length > 60 ? rawBody.substring(0, 60) + '...' : rawBody;
              const displayTitle = conv.title || conv.custom_attributes?.['AI Title'] as string || fallbackTitle || 'Untitled Conversation';
              const displaySubject = conv.source.subject || (rawBody.length > 80 ? rawBody.substring(0, 80) + '...' : rawBody) || 'No description provided.';
              
              return (
                <div key={conv.id || idx} className="border-b border-border transition-colors">
                  <div 
                    onClick={() => setSelectedConversation(conv)}
                    className={`flex items-center px-6 py-4 transition-colors hover:bg-secondary/20 cursor-pointer`}
                  >
                    <div className="flex-1 min-w-0 pr-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{displayTitle}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded border border-border">
                        <MessageSquareWarning className="w-3 h-3" />
                        {
                          1 + (conv.conversation_parts?.conversation_parts || []).filter(p => p.part_type === 'comment' || p.part_type === 'note').length
                        } messages
                      </span>
                      {(conv as any).escalationRisk >= 0.5 && (
                          <div className="group relative flex items-center">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive text-destructive-foreground">
                              High Risk
                            </span>
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border shadow-sm">
                              Elevated escalation risk score
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{displaySubject}</p>
                    </div>
                    
                    <div className="w-40 shrink-0 hidden sm:block">
                      {getClassificationBadge(conv.classification)}
                    </div>

                    <div className="w-24 shrink-0 hidden lg:flex items-center justify-end">
                      <span className={`text-sm font-semibold ${(conv as any).escalationRisk >= 0.5 ? 'text-destructive' : 'text-foreground'}`}>
                        {Math.round((conv as any).escalationRisk * 100)}%
                      </span>
                    </div>
                    
                    <div className="w-32 shrink-0 hidden md:flex items-center justify-end gap-2 text-sm text-muted-foreground mr-4">
                      {format(fromUnixTime(conv.created_at), 'MMM d, HH:mm')}
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
      {/* Conversation Thread Modal */}
      <ConversationThreadModal 
        isOpen={!!selectedConversation}
        onClose={() => setSelectedConversation(null)}
        conversation={selectedConversation}
      />
    </>
  );
}
