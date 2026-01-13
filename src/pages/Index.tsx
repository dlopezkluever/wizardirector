import { useState } from 'react';
import { GlobalSidebar } from '@/components/layout/GlobalSidebar';
import { Dashboard } from '@/pages/Dashboard';
import { ProjectView } from '@/pages/ProjectView';
import StyleCapsuleLibrary from '@/pages/StyleCapsuleLibrary';

const Index = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedProjectId(null);
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleNewProject = () => {
    setSelectedProjectId('new');
  };

  const handleBackToDashboard = () => {
    setSelectedProjectId(null);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <GlobalSidebar 
        currentPath={currentPath} 
        onNavigate={handleNavigate} 
      />
      
      {selectedProjectId ? (
        <ProjectView 
          projectId={selectedProjectId} 
          onBack={handleBackToDashboard} 
        />
      ) : currentPath === '/' ? (
        <Dashboard
          onProjectSelect={handleProjectSelect}
          onNewProject={handleNewProject}
        />
      ) : currentPath === '/style-capsules' ? (
        <StyleCapsuleLibrary />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-xl font-display">
              {currentPath === '/assets' && 'Asset Library'}
            </p>
            <p className="mt-2">
              {currentPath === '/assets' ? 'This section is under development' : 'Page not found'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
