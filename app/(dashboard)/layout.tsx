import Header from '@/components/layout/Header';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}
