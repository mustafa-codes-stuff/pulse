import Sidebar from '@/components/layout/Sidebar';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-6 right-8 z-50 bg-card rounded-md shadow-sm border-2 border-border p-1">
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
