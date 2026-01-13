import { GlobalSidebar } from './GlobalSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <GlobalSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
