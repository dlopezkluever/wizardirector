import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, SortAsc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { NewProjectCard } from '@/components/dashboard/NewProjectCard';
import type { Project, StageStatus } from '@/types/project';

// Mock data for demonstration
const mockProjects: Project[] = [
  {
    id: '1',
    title: 'The Last Sunset',
    description: 'A poignant drama about a retired astronaut facing his final days while reconciling with his estranged daughter.',
    status: 'in-progress',
    branch: 'main',
    currentStage: 4,
    stages: [
      { stage: 1, status: 'locked' as StageStatus, label: 'Input' },
      { stage: 2, status: 'locked' as StageStatus, label: 'Treatment' },
      { stage: 3, status: 'locked' as StageStatus, label: 'Beat Sheet' },
      { stage: 4, status: 'active' as StageStatus, label: 'Script' },
      { stage: 5, status: 'pending' as StageStatus, label: 'Assets' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 3),
    updatedAt: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    title: 'Neon Dreams',
    description: 'A cyberpunk thriller set in 2087 Tokyo, following a data smuggler caught between rival megacorporations.',
    status: 'in-progress',
    branch: 'alt-ending',
    currentStage: 7,
    stages: [
      { stage: 1, status: 'locked' as StageStatus, label: 'Input' },
      { stage: 2, status: 'locked' as StageStatus, label: 'Treatment' },
      { stage: 3, status: 'locked' as StageStatus, label: 'Beat Sheet' },
      { stage: 4, status: 'locked' as StageStatus, label: 'Script' },
      { stage: 5, status: 'locked' as StageStatus, label: 'Assets' },
      { stage: 6, status: 'locked' as StageStatus, label: 'Script Hub' },
      { stage: 7, status: 'active' as StageStatus, label: 'Shot List' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 7),
    updatedAt: new Date(Date.now() - 7200000),
  },
  {
    id: '3',
    title: 'Coffee Shop Encounters',
    description: 'A romantic comedy anthology featuring interconnected stories of love, loss, and second chances.',
    status: 'draft',
    branch: 'main',
    currentStage: 2,
    stages: [
      { stage: 1, status: 'locked' as StageStatus, label: 'Input' },
      { stage: 2, status: 'active' as StageStatus, label: 'Treatment' },
      { stage: 3, status: 'pending' as StageStatus, label: 'Beat Sheet' },
      { stage: 4, status: 'pending' as StageStatus, label: 'Script' },
      { stage: 5, status: 'pending' as StageStatus, label: 'Assets' },
    ],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 1800000),
  },
];

interface DashboardProps {
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
}

export function Dashboard({ onProjectSelect, onNewProject }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = mockProjects.filter(project =>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NewProjectCard onClick={onNewProject} />
          {filteredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onProjectSelect(project.id)}
              index={index + 1}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
