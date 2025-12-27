import { motion } from 'framer-motion';
import { Archive, GitBranch, GitFork, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProjectHeaderProps {
  projectTitle: string;
  currentBranch: string;
  onBack: () => void;
  onOpenVault: () => void;
  onOpenVersionHistory: () => void;
  onCreateBranch: () => void;
}

export function ProjectHeader({
  projectTitle,
  currentBranch,
  onBack,
  onOpenVault,
  onOpenVersionHistory,
  onCreateBranch,
}: ProjectHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-6 py-4 bg-background border-b border-border"
    >
      {/* Left: Back + Title */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {projectTitle}
          </h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-sm text-secondary-foreground">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{currentBranch}</span>
          </div>
        </div>
      </div>

      {/* Right: Project Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenVault}
          className="gap-2"
        >
          <Archive className="w-4 h-4" />
          <span className="hidden md:inline">Artifact Vault</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenVersionHistory}
          className="gap-2"
        >
          <GitBranch className="w-4 h-4" />
          <span className="hidden md:inline">Story Timelines</span>
        </Button>
        
        <Button
          variant="gold"
          size="sm"
          onClick={onCreateBranch}
          className="gap-2"
        >
          <GitFork className="w-4 h-4" />
          <span className="hidden md:inline">New Branch</span>
        </Button>
      </div>
    </motion.header>
  );
}
