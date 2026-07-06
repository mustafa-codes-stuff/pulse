"use client";

import { useFilterContext } from '@/lib/context/FilterContext';

export default function GlobalFilterToggle() {
  const { excludeNoHuman, setExcludeNoHuman } = useFilterContext();

  return (
    <div className="flex items-center space-x-2 group/toggle relative">
      <input
        type="checkbox"
        id="global-exclude-human"
        checked={excludeNoHuman}
        onChange={(e) => setExcludeNoHuman(e.target.checked)}
        className="w-4 h-4 cursor-pointer"
      />
      <label htmlFor="global-exclude-human" className="text-sm font-medium cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
        Hide no-reply conversations
      </label>
      <div className="absolute top-full mt-2 right-0 w-56 p-2.5 bg-popover text-popover-foreground text-xs font-medium rounded-lg opacity-0 group-hover/toggle:opacity-100 transition-opacity pointer-events-none shadow-md leading-relaxed border border-border z-50">
        Excludes conversations where the customer never replied, including ignored automated messages and outbound sequences.
      </div>
    </div>
  );
}
