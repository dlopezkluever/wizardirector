import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, SortAsc, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { NewProjectCard } from '@/components/dashboard/NewProjectCard';
import { NewProjectDialog } from '@/components/dashboard/NewProjectDialog';
import { projectService } from '@/lib/services/projectService';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/types/project';

interface DashboardProps {
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
}

export function Dashboard({ onProjectSelect, onNewProject }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const { toast } = useToast();

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedProjects = await projectService.getProjects();
      setProjects(fetchedProjects);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      toast({
        title: 'Error',
        description: 'Failed to load projects. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (projectId: string) => {
    // Refresh the projects list
    loadProjects();
    // Navigate to the new project
    onProjectSelect(projectId);
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            <div>
              <h1 className="font-display text-4xl font-bold text-foreground tracking-tight">
                Your Projects
              </h1>
              <p className="text-muted-foreground mt-1">
                Transform narratives into AI-generated films
              </p>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-10 bg-secondary border-border"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <SortAsc className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Project Grid */}
      <main className="px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading projects...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadProjects} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NewProjectCard onClick={() => setNewProjectDialogOpen(true)} />
            {filteredProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onProjectSelect(project.id)}
                index={index + 1}
              />
            ))}
            {filteredProjects.length === 0 && !loading && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-2">No projects found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search query.' : 'Create your first project to get started.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={newProjectDialogOpen}
        onOpenChange={setNewProjectDialogOpen}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
