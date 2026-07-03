import Dropzone from '@/components/upload/Dropzone';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Activity } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="w-full border-b border-border py-4 px-6 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Pulse</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="max-w-3xl w-full space-y-8">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Support Conversation Intelligence
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Analyze Intercom exports instantly. Discover operational bottlenecks, emerging product bugs, and customer sentiment—all in your browser.
            </p>
          </div>
          
          <Dropzone />
        </div>
      </main>
      
      <footer className="w-full py-6 text-center text-sm text-muted-foreground border-t border-border mt-auto">
        No data leaves your browser. Safe to use with real support data.
      </footer>
    </div>
  );
}
