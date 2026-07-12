"use client";

import { useState, useEffect, useMemo } from 'react';
import { Database, Settings2 } from 'lucide-react';
import DatasetManager from '@/components/dataset/DatasetManager';
import { getConversations } from '@/lib/storage';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { PulseConversation } from '@/lib/types';
import { filterAnalyzableConversations } from '@/lib/analytics/filters';
import { formatPT } from '@/lib/utils/timezone';


export default function DatasetInfo() {
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  
  const [data, setData] = useState<PulseConversation[] | null>(null);


  useEffect(() => {
    getConversations().then(res => {
      if (res && res.length > 0) setData(res);
    });
  }, []);

  const analyzableData = useMemo(() => {
    if (!data) return null;
    return filterAnalyzableConversations(data).analyzable;
  }, [data]);

  const datasetContext = useMemo(() => {
    if (!analyzableData || analyzableData.length === 0) return null;
    const sources = Array.from(new Set(analyzableData.map(c => c._sourceFilename || 'Unknown Source')));
    const dates = analyzableData.map(c => c.created_at).sort((a, b) => a - b);
    const dateRange = dates.length > 0
      ? `${formatPT(dates[0], 'MMM d, yyyy')} - ${formatPT(dates[dates.length - 1], 'MMM d, yyyy')}`
      : '';

    return {
      sources: sources.join(', '),
      dateRange,
      count: analyzableData.length
    };
  }, [analyzableData]);

  if (!datasetContext) return null;

  return (
    <div className="relative inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-border/60 shadow-sm rounded-full transition-shadow hover:shadow-md">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-default">
              <Database className="w-4 h-4 text-indigo-500" />
              <span className="text-foreground font-semibold whitespace-nowrap">{datasetContext.sources.split(',').length} files uploaded</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="w-80 p-4">
            <h4 className="font-semibold mb-2">Dataset Sources</h4>
            <div className="max-h-32 overflow-y-auto pr-2 space-y-1">
              {datasetContext.sources.split(', ').map((source, i) => (
                <div key={i} className="bg-secondary/50 px-2 py-1.5 rounded truncate font-mono text-[10px]" title={source}>
                  {source}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>

        <span className="text-border px-1">•</span>
        <span className="text-foreground whitespace-nowrap">{datasetContext.dateRange}</span>
        <span className="text-border px-1">•</span>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center cursor-default">
              <span className="text-foreground whitespace-nowrap">{datasetContext.count} conversations</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {data ? `Filtered and deduped from ${data.length} total raw conversations` : 'Deduped and filtered conversations'}
          </TooltipContent>
        </Tooltip>
        
        <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setIsManagerOpen(true)}
                className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Manage dataset
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <DatasetManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
    </div>
  );
}
