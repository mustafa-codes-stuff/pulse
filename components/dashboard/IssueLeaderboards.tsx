"use client";
import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { Bug, Lightbulb, HelpCircle, MessageSquare, Layers, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { aggregateIssues, CATEGORY_DESCRIPTIONS } from '@/lib/analytics/aggregations';

export default function IssueLeaderboards({ 
  data, 
  activeCategory = 'all', 
  onCategorySelect 
}: { 
  data: PulseConversation[], 
  activeCategory?: string | null, 
  onCategorySelect?: (category: string | null) => void 
}) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const issues = useMemo(() => aggregateIssues(data), [data]);

  const tabs = [
    { id: 'all', label: 'All Issues', count: data.length, icon: Layers },
    { id: 'bugs', label: 'Bugs', count: issues.totals.bugs, icon: Bug },
    { id: 'features', label: 'Feature Requests', count: issues.totals.features, icon: Lightbulb },
    { id: 'billing', label: 'Finance & Billing', count: issues.totals.billing, icon: MessageSquare },
    { id: 'other', label: 'Other', count: issues.totals.other, icon: HelpCircle }
  ];

  const activeTabData = useMemo(() => {
    if (activeTab === 'bugs') return issues.bugs;
    if (activeTab === 'features') return issues.features;
    if (activeTab === 'billing') return issues.billing;
    if (activeTab === 'other') return issues.other;
    return [...issues.bugs, ...issues.features, ...issues.billing, ...issues.other].sort((a, b) => b.painIndex - a.painIndex);
  }, [activeTab, issues]);

  return (
    <div className="flex flex-col bg-card border-2 border-border shadow-sm rounded-xl overflow-hidden">
      {/* Tabs Header */}
      <div className="relative border-b border-border bg-secondary/5">
        <div className="flex items-center overflow-x-auto hide-scrollbar pr-12">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center pr-4 pl-4 bg-gradient-to-l from-secondary/5 via-secondary/5 to-transparent">
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              Tabs are generated from aggregate issue categories.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
        {activeTabData.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No issues found for this category.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {activeTabData.map((item, idx) => (
              <div 
                key={item.category}
                onClick={() => onCategorySelect?.(activeCategory === item.category ? null : item.category)}
                className={`flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors cursor-pointer group border-l-4 ${
                  activeCategory === item.category ? 'bg-primary/5 border-l-primary' : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-6 text-center text-sm font-semibold text-muted-foreground group-hover:text-foreground">
                    {idx + 1}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">{item.title}</p>
                    {CATEGORY_DESCRIPTIONS[item.category] && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground/50 flex items-center justify-center text-[10px] font-bold cursor-help hover:text-foreground hover:border-foreground/50 transition-colors">
                            ?
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {CATEGORY_DESCRIPTIONS[item.category]}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {item.painIndex > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 min-w-[100px] justify-end">
                          <span className="text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded">
                            Churn Risk: {(item.painIndex / 10).toFixed(1)}/10
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Based on volume, reopens, and customer sentiment
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <div className="flex items-center gap-1.5 text-muted-foreground w-24 justify-end">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{item.count} tickets</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
