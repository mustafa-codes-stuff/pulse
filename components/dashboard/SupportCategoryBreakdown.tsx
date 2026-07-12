import { useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { MessageSquare } from 'lucide-react';
import { CATEGORY_FRIENDLY_NAMES } from '@/lib/analytics/aggregations';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

interface SupportCategoryMetrics {
  category: string;
  title: string;
  count: number;
  percentage: number;
  averageCsat: number | null;
  reopenRate: number;
  conversations: PulseConversation[];
}

export default function SupportCategoryBreakdown({ data, onCardClick }: { data: PulseConversation[], onCardClick?: (conversations: PulseConversation[], title: string) => void }) {

  const topCategories = useMemo(() => {
    if (data.length === 0) return [];

    const supportCategories = Object.keys(CATEGORY_FRIENDLY_NAMES).filter(cat => cat !== 'system_automated' && cat !== 'general_inquiry' && cat !== 'cross_tagged_engineering' && cat !== 'cross_tagged_product_quality');
    const groups: Record<string, PulseConversation[]> = {};
    supportCategories.forEach(cat => groups[cat] = []);

    let totalOpsCount = 0;
    data.forEach(c => {
      const classification = c.llm_classification?.category || 'general_inquiry';
      if (supportCategories.includes(classification)) {
        groups[classification].push(c);
        totalOpsCount++;
      }
    });

    const list: SupportCategoryMetrics[] = supportCategories.map(cat => {
      const convs = groups[cat] || [];
      const count = convs.length;
      
      let csatSum = 0;
      let csatCount = 0;
      let reopenedCount = 0;

      convs.forEach(c => {
        if (c.statistics?.count_reopens > 0) reopenedCount++;
        if (c.conversation_rating?.rating) {
          csatSum += c.conversation_rating.rating;
          csatCount++;
        }
      });

      return {
        category: cat,
        title: CATEGORY_FRIENDLY_NAMES[cat] || cat,
        count,
        percentage: totalOpsCount > 0 ? (count / totalOpsCount) * 100 : 0,
        averageCsat: csatCount > 0 ? csatSum / csatCount : null,
        reopenRate: count > 0 ? reopenedCount / count : 0,
        conversations: convs
      };
    }).filter(c => c.count > 0);

    // Sort by count descending to get the top 3
    list.sort((a, b) => b.count - a.count);
    const top3 = list.slice(0, 3);

    // Helper to determine the most extreme signal for the supporting copy
    return top3.map((item, index) => {
      let signalLabel = '';
      
      // Calculate ranks across the entire list (1-indexed)
      const countRank = [...list].sort((a,b) => b.count - a.count).findIndex(c => c.category === item.category) + 1;
      const reopenRank = [...list].sort((a,b) => b.reopenRate - a.reopenRate).findIndex(c => c.category === item.category) + 1;
      
      // For CSAT, we only want to rank items that actually have a CSAT score, lowest is #1
      const withCsat = list.filter(c => c.averageCsat !== null);
      const csatRank = item.averageCsat !== null 
        ? [...withCsat].sort((a,b) => a.averageCsat! - b.averageCsat!).findIndex(c => c.category === item.category) + 1 
        : 999;

      // Find best rank (lowest number is best)
      const bestRank = Math.min(countRank, reopenRank, csatRank);

      if (bestRank === countRank && countRank <= 3) {
        signalLabel = countRank === 1 ? 'highest volume' : `high volume`;
      } else if (bestRank === reopenRank && reopenRank <= 3) {
        signalLabel = reopenRank === 1 ? `highest reopen rate (${(item.reopenRate * 100).toFixed(1)}%)` : `high reopen rate (${(item.reopenRate * 100).toFixed(1)}%)`;
      } else if (bestRank === csatRank && csatRank <= 3) {
        signalLabel = csatRank === 1 ? `lowest CSAT (${item.averageCsat?.toFixed(1)})` : `low CSAT (${item.averageCsat?.toFixed(1)})`;
      } else {
        // Fallback to volume if nothing is notably extreme
        signalLabel = `${item.percentage.toFixed(0)}% of volume`;
      }

      // Special overrides for absolute #1s if they are in the top 3, to guarantee diversity if possible
      // This matches the user's specific request behavior where Pre-sales is volume, Refund is reopen, Image is CSAT
      if (countRank === 1) signalLabel = 'highest volume';
      else if (reopenRank === 1) signalLabel = `highest reopen rate (${(item.reopenRate * 100).toFixed(1)}%)`;
      else if (csatRank === 1) signalLabel = `lowest CSAT (${item.averageCsat?.toFixed(1)})`;

      return {
        ...item,
        signalLabel
      };
    });

  }, [data]);

  if (data.length === 0 || topCategories.length === 0) return null;

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-chart-1" />
        Top customer issues
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground/50 flex items-center justify-center text-[10px] font-bold cursor-help hover:text-foreground hover:border-foreground/50 transition-colors ml-1">
              ?
            </div>
          </TooltipTrigger>
          <TooltipContent>
            The highest volume support categories extracted from the conversations.
          </TooltipContent>
        </Tooltip>
      </h2>
      <div className="flex-1 bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {topCategories.map((item, index) => (
          <div 
            key={item.category} 
            onClick={() => {
              if (onCardClick) {
                onCardClick(item.conversations, `Category: ${item.title}`);
              }
            }}
            className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 ${index !== 0 ? 'border-t border-border/40' : ''} hover:bg-secondary/40 transition-colors gap-4 cursor-pointer group`}
          >
            <div className="flex flex-col gap-1.5 group-hover:translate-x-1 transition-transform duration-300">
              <h3 className="text-sm font-bold text-foreground transition-colors">{item.title}</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/80">{item.count}</span> conversations
                </p>
                {(() => {
                  const labelStr = item.signalLabel.toLowerCase();
                  let badgeColor = 'bg-secondary text-secondary-foreground border-border/50';
                  
                  if (labelStr.includes('reopen') || labelStr.includes('csat')) {
                    badgeColor = 'bg-destructive/10 text-destructive border-destructive/20';
                  } else if (labelStr.includes('highest volume')) {
                    badgeColor = 'bg-chart-4/10 text-chart-4 border-chart-4/20';
                  }

                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold border cursor-help ${badgeColor}`}>
                          {item.signalLabel}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        This category has an unusually extreme metric compared to others.
                      </TooltipContent>
                    </Tooltip>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
