"use client";

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PulseConversation } from '@/lib/types';
import ConversationModal from './ConversationModal';

export default function TicketState({ data }: { data: PulseConversation[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<PulseConversation[]>([]);
  const [initialFilter, setInitialFilter] = useState<any>({});

  const stateData = useMemo(() => {
    let closed = 0, snoozed = 0, open = 0;
    data.forEach(c => {
      if (c.state === 'closed') closed++;
      else if (c.state === 'snoozed') snoozed++;
      else if (c.state === 'open') open++;
    });
    return [
      { name: 'Closed', value: closed, color: 'var(--color-chart-3)' },
      { name: 'Snoozed', value: snoozed, color: 'var(--color-chart-2)' },
      { name: 'Open', value: open, color: 'var(--color-chart-4)' },
    ];
  }, [data]);

  return (
    <div className="w-full p-6 bg-card border border-border rounded-xl flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-2 shrink-0">Ticket State</h2>
      <p className="text-sm text-muted-foreground mb-6 shrink-0">Distribution of current states.</p>
      
      <div className="w-full flex-1 min-h-[250px]">
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
                <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer outline-none" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
              itemStyle={{ color: 'var(--color-popover-foreground)' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}
            />
          </PieChart>
        </ResponsiveContainer>
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
