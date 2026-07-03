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

  const metrics = useMemo(() => {
    let withAttachments = 0;
    
    snoozedTickets.forEach(c => {
      // Check custom attribute for attachments (since array seems to be stripped or rare)
      if (c.custom_attributes?.['Has attachments']) {
        withAttachments++;
      }
    });

    return {
      total: snoozedTickets.length,
      withAttachments,
      withoutAttachments: snoozedTickets.length - withAttachments
    };
  }, [snoozedTickets]);

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
        {/* Attachment Split */}
        <div 
          onClick={() => {
            setModalTitle("Snoozed (With Attachments)");
            setModalData(snoozedTickets.filter(c => c.custom_attributes?.['Has attachments']));
            setInitialFilter({ status: 'snoozed' });
            setIsModalOpen(true);
          }}
          className="group p-4 bg-secondary/50 rounded-xl border border-border/50 hover:bg-secondary transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-chart-4" />
              <span className="text-sm font-medium">Awaiting Attachments</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{metrics.withAttachments}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            These tickets have the "Has attachments" attribute set, indicating they might be waiting on user uploads or verifying documents.
          </div>
        </div>

        <div 
          onClick={() => {
            setModalTitle("Snoozed (No Attachments)");
            setModalData(snoozedTickets.filter(c => !c.custom_attributes?.['Has attachments']));
            setInitialFilter({ status: 'snoozed' });
            setIsModalOpen(true);
          }}
          className="group p-4 bg-secondary/50 rounded-xl border border-border/50 hover:bg-secondary transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-chart-3" />
              <span className="text-sm font-medium">Standard Snoozed</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{metrics.withoutAttachments}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Standard follow-ups lacking attachments.
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
