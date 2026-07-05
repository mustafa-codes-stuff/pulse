"use client";

import { useState, useMemo } from 'react';
import { PulseConversation } from '@/lib/types';
import { Clock, Paperclip, AlertTriangle } from 'lucide-react';
import ConversationModal from './ConversationModal';
import { format, fromUnixTime } from 'date-fns';

export default function SnoozeAnalysis({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);
  const [initialFilter, setInitialFilter] = useState<any>({});

  const snoozedTickets = useMemo(() => {
    return data.filter(c => c.state === 'snoozed');
  }, [data]);

  const datasetMaxTime = useMemo(() => {
    return Math.max(0, ...data.map(c => c.updated_at || c.created_at));
  }, [data]);

  const metrics = useMemo(() => {
    let overdue = 0;
    
    snoozedTickets.forEach(c => {
      if (c.snoozed_until && c.snoozed_until < datasetMaxTime) {
        overdue++;
      }
    });

    return {
      total: snoozedTickets.length,
      overdue,
      pending: snoozedTickets.length - overdue
    };
  }, [snoozedTickets, datasetMaxTime]);

  return (
    <div className="w-full h-full p-6 bg-card border border-border rounded-xl flex flex-col">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-chart-2 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Snooze Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Deep dive into the {metrics.total} snoozed conversations.
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Overdue */}
        <div 
          onClick={() => {
            setModalTitle("Overdue Snoozes");
            setModalData(snoozedTickets.filter(c => c.snoozed_until && c.snoozed_until < datasetMaxTime));
            setInitialFilter({ status: 'snoozed' });
            setIsModalOpen(true);
          }}
          className="group p-4 bg-destructive/10 rounded-xl border border-destructive/20 hover:bg-destructive/20 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Overdue Snoozes</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-destructive">{metrics.overdue}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Snoozes that have expired relative to the dataset's latest activity. Critical operational signal.
          </div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => {
            setModalTitle("Pending Snoozes");
            setModalData(snoozedTickets.filter(c => !c.snoozed_until || c.snoozed_until >= datasetMaxTime));
            setInitialFilter({ status: 'snoozed' });
            setIsModalOpen(true);
          }}
          className="group p-4 bg-secondary/50 rounded-xl border border-border/50 hover:bg-secondary transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-chart-4" />
              <span className="text-sm font-medium">Pending Snoozes</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{metrics.pending}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Snoozes that are still waiting for their scheduled time.
          </div>
        </div>
      </div>

      <ConversationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        conversations={modalData}
        initialFilter={initialFilter}
      />
    </div>
  );
}
