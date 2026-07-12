"use client";

import { PulseConversation } from '@/lib/types';
import FlaggedMoments from './FlaggedMoments';

export default function ServiceMetricsInsights({ data }: { data: PulseConversation[] }) {
  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex-1 overflow-hidden p-6 relative">
        <FlaggedMoments data={data} isTab={true} />
      </div>
    </div>
  );
}
