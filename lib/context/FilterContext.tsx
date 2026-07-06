"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
  excludeNoHuman: boolean;
  setExcludeNoHuman: (value: boolean) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [excludeNoHuman, setExcludeNoHuman] = useState(false);

  return (
    <FilterContext.Provider value={{ excludeNoHuman, setExcludeNoHuman }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterContext() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
}
