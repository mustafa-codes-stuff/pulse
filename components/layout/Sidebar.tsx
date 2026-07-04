"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Activity, LayoutDashboard, BrainCircuit, Upload, Moon, Sun, X, Calendar, FileText } from 'lucide-react';
import { format, fromUnixTime } from 'date-fns';
import { useState } from 'react';
import DatasetManager from '@/components/dataset/DatasetManager';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Link from 'next/link';

export default function Sidebar() {
  const pathname = usePathname();
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const navItems = [
    { name: 'Support Ops', href: '/support', icon: LayoutDashboard },
    { name: 'Engineering', href: '/engineering', icon: BrainCircuit },
  ];

  return (
    <>
      <aside className="w-64 border-r border-border bg-card flex flex-col h-screen shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Pulse</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-4">
          <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary/30 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <h3 className="text-sm font-bold text-foreground mb-1 relative z-10">Dataset Manager</h3>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed relative z-10">Add, remove, or clear JSON log files to update analysis.</p>
            <button
              onClick={() => setIsManagerOpen(true)}
              className="relative z-10 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-bold transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              Manage Dataset
            </button>
          </div>
        </div>
      </aside>
      
      {/* Import lazily or directly. Since this is a client component, direct is fine but let's make sure we have the import */}
      <DatasetManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
    </>
  );
}
