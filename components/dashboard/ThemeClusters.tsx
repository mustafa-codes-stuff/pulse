"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import ConversationModal from './ConversationModal';

export default function ThemeClusters({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);

  const topThemes = useMemo(() => {
    const counts: Record<string, number> = {};
    
    data.forEach(c => {
      const aiTitle = c.custom_attributes?.['AI Title'] as string;
      if (aiTitle) {
        counts[aiTitle] = (counts[aiTitle] || 0) + 1;
      }
    });
    
    // Sort by count descending, take top 15
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([term, count]) => ({ term, count }));
  }, [data]);

  return (
    <div className="w-full p-6 bg-card border border-border rounded-xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Top AI Themes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Extracted directly from the `AI Title` conversation attribute.
        </p>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {topThemes.map(({ term, count }, index) => {
          // Calculate relative size or opacity based on rank
          const opacity = Math.max(0.4, 1 - (index * 0.05));
          
          return (
            <div 
              key={term}
              onClick={() => {
                setModalTitle(`Theme: "${term}"`);
                setModalData(data.filter(c => c.custom_attributes?.['AI Title'] === term));
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center gap-2 hover:scale-[1.05] hover:bg-primary/20 transition-all cursor-pointer shadow-sm hover:shadow-md"
              style={{ opacity }}
            >
              <span className="font-medium">{term}</span>
              <span className="text-xs bg-background px-2 py-0.5 rounded-full text-muted-foreground">
                {count}
              </span>
            </div>
          );
        })}
        {topThemes.length === 0 && (
          <p className="text-muted-foreground text-sm">No significant themes found.</p>
        )}
      </div>

      <ConversationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        conversations={modalData}
      />
    </div>
  );
}
