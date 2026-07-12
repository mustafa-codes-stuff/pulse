"use client";

import { useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { Sparkles, MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

export default function ProductQualitySummaryCard({ 
  data, 
  activeCategory,
  onCategorySelect
}: { 
  data: PulseConversation[],
  activeCategory: string | null,
  onCategorySelect: (category: string | null) => void
}) {
  const productQualityCount = useMemo(() => {
    return data.filter(conv => {
      const also_relevant_to = conv.llm_classification?.also_relevant_to || [];
      return also_relevant_to?.includes('product_quality');
    }).length;
  }, [data]);

  if (productQualityCount === 0) return null;

  const isActive = activeCategory === 'cross_tagged_product_quality';

  return (
    <div className="flex flex-col bg-card border-2 border-border shadow-sm rounded-xl overflow-hidden mt-6">
       <div 
         onClick={() => onCategorySelect(isActive ? null : 'cross_tagged_product_quality')}
         className={`flex items-center justify-between p-4 cursor-pointer transition-colors group ${
           isActive ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-secondary/20 border-l-4 border-l-transparent'
         }`}
       >
          <div className="flex items-center gap-3">
             <Sparkles className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-amber-500'}`} />
             <p className={`text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
               Product Quality Signals (from Support)
               <Tooltip>
                 <TooltipTrigger asChild>
                   <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full border border-muted-foreground/30 text-[10px] text-muted-foreground/50 cursor-help hover:text-foreground hover:border-foreground/50 transition-colors">?</span>
                 </TooltipTrigger>
                 <TooltipContent>
                   Support tickets that have been cross-tagged as relevant to engineering for UI friction, confusing copy, or user experience issues.
                 </TooltipContent>
               </Tooltip>
             </p>
          </div>
          <div className="flex items-center gap-2.5">
             <Tooltip>
               <TooltipTrigger asChild>
                 <div className="flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded border border-border/50 text-xs font-semibold text-muted-foreground group-hover:bg-secondary/80 transition-colors cursor-help">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {productQualityCount} ticket{productQualityCount !== 1 ? 's' : ''}
                 </div>
               </TooltipTrigger>
               <TooltipContent>
                 Total tickets classified as product quality feedback.
               </TooltipContent>
             </Tooltip>
          </div>
       </div>
    </div>
  );
}
