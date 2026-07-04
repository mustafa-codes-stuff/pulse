"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import ConversationModal from './ConversationModal';
import { Bug, Lightbulb, Users, MessageSquare, HelpCircle } from 'lucide-react';
import { aggregateIssues, IssueStats } from '@/lib/analytics/aggregations';
import { format, fromUnixTime } from 'date-fns';

export default function IssueLeaderboards({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const { bugs, features, other, totals } = useMemo(() => aggregateIssues(data), [data]);

  const datasetContext = useMemo(() => {
    if (data.length === 0) return null;
    const sources = Array.from(new Set(data.map(c => c._sourceFilename || 'Unknown Source')));
    const dates = data.map(c => c.created_at).sort((a, b) => a - b);
    const dateRange = dates.length > 0 
      ? `${format(fromUnixTime(dates[0]), 'MMM d, yyyy')} - ${format(fromUnixTime(dates[dates.length - 1]), 'MMM d, yyyy')}` 
      : '';
    
    return {
      sources: sources.join(', '),
      dateRange
    };
  }, [data]);

  const renderLeaderboard = (title: string, Icon: React.ElementType, items: IssueStats[], colorClass: string, bgClass: string) => (
    <div className="flex-1 min-w-[300px] flex flex-col bg-card border border-border rounded-xl overflow-hidden">
      <div className={`p-4 border-b border-border ${bgClass} flex items-center gap-2`}>
        {Icon && <Icon className={`w-5 h-5 ${colorClass}`} />}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-0">
        {items.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No issues found.</div>
        ) : (
          items.map((item, index) => (
            <div 
              key={index}
              onClick={() => {
                setModalTitle(`Issue: ${item.title}`);
                setModalData(item.conversations);
                setIsModalOpen(true);
              }}
              className="flex items-center justify-between p-4 border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${bgClass} ${colorClass}`}>
                  {index + 1}
                </div>
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 bg-secondary/50 rounded-md border border-border/50">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground/80">{item.count} {item.count === 1 ? 'ticket' : 'tickets'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {datasetContext && (
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground bg-secondary/30 border border-border px-4 py-2 rounded-lg w-fit mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-chart-2 animate-pulse"></span>
            Data from: {datasetContext.sources}
          </div>
          {datasetContext.dateRange && (
            <>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                Date Range: {datasetContext.dateRange}
              </div>
            </>
          )}
        </div>
      )}
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Bug className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-sm">Total Bugs</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{totals.bugs}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Lightbulb className="w-5 h-5 text-chart-2" />
            <h3 className="font-semibold text-sm">Total Features</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{totals.features}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Other Inquiries</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{totals.other}</p>
        </div>
      </div>

      <div className="w-full flex flex-col lg:flex-row gap-6">
        {renderLeaderboard('Top Bugs', Bug, bugs, 'text-destructive', 'bg-destructive/10')}
        {renderLeaderboard('Top Feature Requests', Lightbulb, features, 'text-chart-2', 'bg-chart-2/10')}
        {renderLeaderboard('Top Other Inquiries', HelpCircle, other, 'text-muted-foreground', 'bg-muted')}
      </div>

      <ConversationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        conversations={modalData}
        type="engineering"
      />
    </>
  );
}
