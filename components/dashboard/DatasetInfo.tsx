"use client";

import { useState, useEffect, useMemo } from 'react';
import { Database, Info, Settings2 } from 'lucide-react';
import DatasetManager from '@/components/dataset/DatasetManager';
import { getConversations } from '@/lib/storage';
import { PulseConversation } from '@/lib/types';
import { filterAnalyzableConversations } from '@/lib/analytics/filters';
import { formatPT } from '@/lib/utils/timezone';
import { useFilterContext } from '@/lib/context/FilterContext';

export default function DatasetInfo() {
  const [showPopover, setShowPopover] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  
  const [data, setData] = useState<PulseConversation[] | null>(null);
  const { excludeNoHuman } = useFilterContext();

  useEffect(() => {
    getConversations().then(res => {
      if (res && res.length > 0) setData(res);
    });
  }, []);

  const analyzableData = useMemo(() => {
    if (!data) return null;
    return filterAnalyzableConversations(data, excludeNoHuman).analyzable;
  }, [data, excludeNoHuman]);

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
        <Database className="w-4 h-4 text-indigo-500" />
        <span className="text-foreground font-semibold whitespace-nowrap">{datasetContext.sources.split(',').length} files uploaded</span>
        <span className="text-border px-1">•</span>
        <span className="text-foreground whitespace-nowrap">{datasetContext.dateRange}</span>
        <span className="text-border px-1">•</span>
        <span className="text-foreground whitespace-nowrap">{datasetContext.count} conversations</span>
        
        <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
          <div className="group/info relative">
            <button 
              onMouseEnter={() => setShowPopover(true)}
              onMouseLeave={() => setShowPopover(false)}
              onClick={() => setShowPopover(!showPopover)}
              className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center"
            >
              <Info className="w-4 h-4" />
            </button>
            {showPopover && (
              <div 
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 p-4 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg z-50 text-xs"
                onMouseEnter={() => setShowPopover(true)}
                onMouseLeave={() => setShowPopover(false)}
              >
                <h4 className="font-semibold mb-2">Dataset Sources</h4>
                <div className="max-h-32 overflow-y-auto pr-2 space-y-1">
                  {datasetContext.sources.split(', ').map((source, i) => (
                    <div key={i} className="bg-secondary/50 px-2 py-1.5 rounded truncate font-mono text-[10px]" title={source}>
                      {source}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="group/manage relative">
            <button 
              onClick={() => setIsManagerOpen(true)}
              className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 p-2.5 bg-popover text-popover-foreground text-xs font-medium rounded-lg opacity-0 group-hover/manage:opacity-100 transition-opacity pointer-events-none shadow-md leading-relaxed border border-border z-50 text-center">
              Manage dataset
            </div>
          </div>
        </div>
      </div>

      <DatasetManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
    </div>
  );
}
