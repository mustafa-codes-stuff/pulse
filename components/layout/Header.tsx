"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import DatasetInfo from '@/components/dashboard/DatasetInfo';

export default function Header() {
  const pathname = usePathname();

  const tabs = [
    { name: 'Support Ops', href: '/support' },
    { name: 'Engineering', href: '/engineering' },
  ];

  return (
    <header className="sticky top-0 w-full backdrop-blur-2xl bg-background/70 border-b border-border/50 shrink-0 flex flex-col z-50 shadow-sm transition-all">
      {/* Row 1: Logo & Global Controls */}
      <div className="h-16 px-8 flex items-center justify-between relative">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Pulse</span>
        </Link>
        
        <div className="absolute left-1/2 -translate-x-1/2 pt-1">
          <DatasetInfo />
        </div>

        <div className="flex items-center gap-6">
          <ThemeToggle />
        </div>
      </div>

      {/* Row 2: Section Tabs */}
      <div className="flex items-center px-8 h-12">
        <nav className="flex items-center gap-6 h-full">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`relative flex items-center h-full text-sm font-semibold transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.name}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
