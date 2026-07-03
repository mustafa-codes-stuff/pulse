"use client";

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PulseConversation } from '@/lib/types';
import ConversationModal from './ConversationModal';

export default function StateDemographics({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);
  const [initialFilter, setInitialFilter] = useState<any>({});

  const { stateData, channelData } = useMemo(() => {
    let closed = 0, snoozed = 0, open = 0;
    let email = 0, conversation = 0;

    data.forEach(c => {
      if (c.state === 'closed') closed++;
      else if (c.state === 'snoozed') snoozed++;
      else if (c.state === 'open') open++;

      if (c.source?.type === 'email') email++;
      else if (c.source?.type === 'conversation') conversation++;
    });

    return {
      stateData: [
        { name: 'Closed', value: closed, color: 'var(--color-chart-3)' },
        { name: 'Snoozed', value: snoozed, color: 'var(--color-chart-2)' },
        { name: 'Open', value: open, color: 'var(--color-chart-4)' },
      ],
      channelData: [
        { name: 'Chat', value: conversation, color: 'var(--color-chart-1)' },
        { name: 'Email', value: email, color: 'var(--color-muted-foreground)' },
      ]
    };
  }, [data]);

  return (
    <div className="w-full h-full min-h-[400px] p-6 bg-card border border-border rounded-xl flex flex-col">
      <h2 className="text-lg font-semibold mb-2 shrink-0">Demographics & Channels</h2>
      <p className="text-sm text-muted-foreground mb-6 shrink-0">Distribution of states and sources.</p>
      
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6">
        {/* State Donut */}
        <div className="flex-1 flex flex-col items-center justify-center relative group">
          <h3 className="text-sm font-medium absolute top-0 w-full text-center">Ticket State</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stateData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                onClick={(entry: any) => {
                  if (!entry.name) return;
                  setModalTitle(`State: ${entry.name}`);
                  setModalData(data);
                  setInitialFilter({ status: entry.name.toLowerCase() });
                  setIsModalOpen(true);
                }}
              >
                {stateData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity outline-none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--color-popover-foreground)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-full mt-2 w-full flex justify-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-chart-3" />Closed</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-chart-2" />Snoozed</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-chart-4" />Open</div>
          </div>
        </div>

        <div className="w-px h-full bg-border hidden md:block" />

        {/* Channel Donut */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <h3 className="text-sm font-medium absolute top-0 w-full text-center">Source Channel</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={channelData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                onClick={(entry: any) => {
                  if (!entry.name) return;
                  const val = entry.name === 'Chat' ? 'conversation' : 'email';
                  setModalTitle(`Channel: ${entry.name}`);
                  setModalData(data.filter(c => c.source?.type === val));
                  setInitialFilter({});
                  setIsModalOpen(true);
                }}
              >
                {channelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity outline-none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--color-popover-foreground)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-full mt-2 w-full flex justify-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-chart-1" />Chat</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-muted-foreground" />Email</div>
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
