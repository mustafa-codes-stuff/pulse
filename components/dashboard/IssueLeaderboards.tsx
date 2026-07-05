"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import ConversationModal from './ConversationModal';
import { Bug, Lightbulb, Users, MessageSquare, HelpCircle, ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from 'lucide-react';
import { aggregateIssues, CategoryPainMetrics } from '@/lib/analytics/aggregations';
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

  const overallMidDate = useMemo(() => {
    if (data.length === 0) return 0;
    const dates = data.map(c => c.created_at).sort((a, b) => a - b);
    return dates[Math.floor(dates.length / 2)];
  }, [data]);

  const getTrend = (conversations: PulseConversation[]) => {
    if (conversations.length < 2 || overallMidDate === 0) return { icon: Minus, color: 'text-muted-foreground', label: 'steady' };
    
    const firstHalfCount = conversations.filter(c => c.created_at < overallMidDate).length;
    const secondHalfCount = conversations.filter(c => c.created_at >= overallMidDate).length;
    
    if (secondHalfCount > firstHalfCount * 1.5 && secondHalfCount > 2) {
      return { icon: ArrowUpRight, color: 'text-destructive', label: 'rising' };
    } else if (secondHalfCount < firstHalfCount * 0.5 && firstHalfCount > 2) {
      return { icon: ArrowDownRight, color: 'text-chart-2', label: 'declining' };
    }
    return { icon: Minus, color: 'text-muted-foreground', label: 'steady' };
  };

  const renderLeaderboard = (title: string, Icon: React.ElementType, items: CategoryPainMetrics[], colorClass: string, bgClass: string) => {
    const emptyText = `No ${title.toLowerCase().replace('top ', '')} found.`;
    return (
      <div className="flex-1 min-w-[300px] flex flex-col bg-card border-2 border-border shadow-sm rounded-xl overflow-hidden shadow-sm">
        <div className={`p-4 border-b border-border ${bgClass} flex items-center gap-2`}>
          {Icon && <Icon className={`w-5 h-5 ${colorClass}`} />}
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="p-0">
          {items.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">{emptyText}</div>
          ) : (
            items.map((item, index) => {
              const trend = getTrend(item.conversations);
              return (
                <div
                  key={index}
                  onClick={() => {
                    setModalTitle(`Category: ${item.title}`);
                    setModalData(item.conversations);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center justify-between p-4 border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer last:border-0 group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${bgClass} ${colorClass}`}>
                      {index + 1}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className={`flex items-center justify-center ${trend.color}`} title={`Trend: ${trend.label}`}>
                      <trend.icon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.painIndex > 60 ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          item.painIndex > 30 ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' :
                          'bg-muted text-muted-foreground border-border'
                        }`}
                        title="Customer Pain Index (Volume + Sentiment + Reopens)"
                      >
                        Pain: {item.painIndex}%
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary/50 rounded border border-border/50 text-[10px] text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        {item.count}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

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
        <div className="bg-card border-2 border-border shadow-sm rounded-xl p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Bug className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-sm">Total Bugs</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{totals.bugs}</p>
        </div>
        <div className="bg-card border-2 border-border shadow-sm rounded-xl p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Lightbulb className="w-5 h-5 text-chart-2" />
            <h3 className="font-semibold text-sm">Total Feature Requests</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{totals.features}</p>
        </div>
        <div className="bg-card border-2 border-border shadow-sm rounded-xl p-4 flex flex-col justify-center">
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
