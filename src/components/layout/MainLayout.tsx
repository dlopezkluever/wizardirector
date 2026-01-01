import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobalSidebar } from './GlobalSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const [currentPath, setCurrentPath] = useState('/dashboard');

  const handleNavigation = (path: string) => {
    setCurrentPath(path);
    navigate(path);
  };

  const handleProjectSelect = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleNewProject = () => {
    // TODO: Implement new project creation
    console.log('New project clicked');
  };

  return (
    <div className="flex h-screen bg-background">
      <GlobalSidebar
        currentPath={currentPath}
        onNavigate={handleNavigation}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
