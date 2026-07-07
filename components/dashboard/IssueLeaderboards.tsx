"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { Bug, Lightbulb, HelpCircle, ArrowUpRight, ArrowDownRight, Minus, MessageSquare, Layers } from 'lucide-react';
import { aggregateIssues, CategoryPainMetrics } from '@/lib/analytics/aggregations';

export default function IssueLeaderboards({ 
  data, 
  activeCategory, 
  onCategorySelect 
}: { 
  data: PulseConversation[], 
  activeCategory: string | null, 
  onCategorySelect: (category: string | null) => void 
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'bugs' | 'features' | 'other'>('all');

  const { bugs, features, other, totals } = useMemo(() => aggregateIssues(data), [data]);
  
  const allSignals = useMemo(() => {
    return [...bugs, ...features, ...other].sort((a, b) => b.painIndex - a.painIndex);
  }, [bugs, features, other]);

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

  const tabs = [
    { id: 'all', label: 'All signals', icon: Layers, count: totals.bugs + totals.features + totals.other },
    { id: 'bugs', label: 'Bugs', icon: Bug, count: totals.bugs },
    { id: 'features', label: 'Feature Requests', icon: Lightbulb, count: totals.features },
    { id: 'other', label: 'Other', icon: HelpCircle, count: totals.other },
  ];

  let displayItems: CategoryPainMetrics[] = [];
  if (activeTab === 'all') displayItems = allSignals;
  else if (activeTab === 'bugs') displayItems = bugs;
  else if (activeTab === 'features') displayItems = features;
  else if (activeTab === 'other') displayItems = other;

  return (
    <div className="flex flex-col bg-card border-2 border-border shadow-sm rounded-xl overflow-hidden">
      {/* Tabs Header */}
      <div className="flex items-center overflow-x-auto border-b border-border hide-scrollbar bg-secondary/5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-primary text-primary bg-background' 
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Leaderboard List */}
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
        {displayItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No signals found for this category.
          </div>
        ) : (
          displayItems.map((item, index) => {
            const trend = getTrend(item.conversations);
            const isActive = activeCategory === item.category;
            
            return (
              <div
                key={item.category}
                onClick={() => onCategorySelect(isActive ? null : item.category)}
                className={`flex items-center justify-between p-4 border-b border-border/50 cursor-pointer transition-colors group ${
                  isActive ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-secondary/20 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors'
                  }`}>
                    {index + 1}
                  </div>
                  <p className={`text-sm font-medium truncate transition-colors ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                    {item.title}
                  </p>
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className={`flex items-center justify-center ${trend.color}`} title={`Trend: ${trend.label}`}>
                    <trend.icon className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="group/tooltip relative flex items-center">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 text-[10px] font-bold cursor-help">
                        Friction: {item.painIndex}%
                      </div>
                      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 w-48 p-2 bg-popover text-popover-foreground text-xs font-medium rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 group-hover/tooltip:delay-300 pointer-events-none z-10 border border-border shadow-md text-center">
                        Percentage of tickets in this category showing customer frustration or risk.
                      </div>
                    </div>
                    
                    <div className="group/tooltip relative flex items-center">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary/50 rounded border border-border/50 text-[10px] text-muted-foreground cursor-help">
                        <MessageSquare className="w-3 h-3" />
                        {item.count} {item.lowConfidenceCount > 0 && `· ${item.lowConfidenceCount} low confidence`}
                      </div>
                      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 w-48 p-2 bg-popover text-popover-foreground text-xs font-medium rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 group-hover/tooltip:delay-300 pointer-events-none z-10 border border-border shadow-md text-center">
                        Total tickets (and how many the tool was not highly confident in categorizing).
                      </div>
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
}
