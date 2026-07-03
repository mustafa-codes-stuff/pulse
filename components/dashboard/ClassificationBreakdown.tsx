"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { classifyConversation, hasAttachmentReferences } from '@/lib/nlp/heuristics';
import { Bug, Lightbulb, HelpCircle, Paperclip } from 'lucide-react';
import ConversationModal from './ConversationModal';

export default function ClassificationBreakdown({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);
  const [initialFilter, setInitialFilter] = useState<any>({});

  const metrics = useMemo(() => {
    let bugs = 0;
    let features = 0;
    let others = 0;
    let attachments = 0;
    
    for (const c of data) {
      const cls = classifyConversation(c.title || '', c.source.body || '');
      if (cls === 'bug') bugs++;
      else if (cls === 'feature_request') features++;
      else others++;
      
      if (hasAttachmentReferences(c.source.body)) {
        attachments++;
      }
    }
    
    const total = data.length;
    return { bugs, features, others, attachments, total };
  }, [data]);

  const items = [
    { label: 'Bug Reports', count: metrics.bugs, icon: Bug, color: 'text-destructive', bg: 'bg-destructive', filterFn: (d: PulseConversation[]) => d.filter(c => classifyConversation(c.title || '', c.source.body || '') === 'bug') },
    { label: 'Feature Requests', count: metrics.features, icon: Lightbulb, color: 'text-chart-2', bg: 'bg-chart-2', filterFn: (d: PulseConversation[]) => d.filter(c => classifyConversation(c.title || '', c.source.body || '') === 'feature_request') },
    { label: 'Other Inquiries', count: metrics.others, icon: HelpCircle, color: 'text-muted-foreground', bg: 'bg-muted-foreground', filterFn: (d: PulseConversation[]) => d.filter(c => {
        const cls = classifyConversation(c.title || '', c.source.body || '');
        return cls !== 'bug' && cls !== 'feature_request';
      }) 
    },
  ];

  return (
    <div className="w-full h-full p-6 bg-card border border-border rounded-xl flex flex-col">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Heuristic Classification</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Bucketizing conversations using keyword heuristics.
          </p>
        </div>
        
        <button 
          onClick={() => {
            setModalTitle('Conversations with Attachments');
            setModalData(data);
            setInitialFilter({ attachment: 'with' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Paperclip className="w-4 h-4 text-muted-foreground" />
          <span>{metrics.attachments}</span>
          <span className="text-muted-foreground font-normal ml-1 hidden sm:inline">have attachments</span>
        </button>
      </div>
      
      <div className="space-y-6">
        {items.map(item => {
          const percentage = metrics.total > 0 ? (item.count / metrics.total) * 100 : 0;
          
          return (
            <div 
              key={item.label} 
              onClick={() => {
                setModalTitle(item.label);
                setModalData(data);
                const filterValue = item.label === 'Bug Reports' ? 'bug' : item.label === 'Feature Requests' ? 'feature_request' : 'other';
                setInitialFilter({ classification: filterValue });
                setIsModalOpen(true);
              }}
              className="group p-3 -mx-3 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">{item.count.toLocaleString()}</span>
                  <span className="text-muted-foreground w-12 text-right">{percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div 
                  className={`h-full rounded-full ${item.bg}`} 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <ConversationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        conversations={modalData}
        type="engineering"
        initialFilter={initialFilter}
      />
    </div>
  );
}
