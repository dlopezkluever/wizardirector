import { useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Clock, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { projectService } from '@/lib/services/projectService';
import { useToast } from '@/hooks/use-toast';
import type { Project, StageStatus } from '@/types/project';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete: () => void;
  index: number;
}

function StageIndicator({ status }: { status: StageStatus }) {
  const statusStyles: Record<StageStatus, string> = {
    locked: 'bg-success',
    active: 'bg-primary animate-pulse-glow',
    pending: 'bg-muted-foreground/40',
    outdated: 'bg-warning',
  };

  return (
    <span className={cn('w-2 h-2 rounded-full', statusStyles[status])} />
  );
}

export function ProjectCard({ project, onClick, onDelete, index }: ProjectCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Project is in production if scenes exist (regardless of stage lock/outdated status)
  const inProduction = !!project.sceneProgress && project.sceneProgress.totalScenes > 0;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await projectService.deleteProject(project.id);
      toast({
        title: 'Project deleted',
        description: `"${project.title}" has been permanently deleted.`,
      });
      onDelete();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={showDeleteDialog || isDeleting ? undefined : onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-card border border-border card-hover",
        showDeleteDialog || isDeleting ? "" : "cursor-pointer"
      )}
    >
      {/* Delete button overlay */}
      <div
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (!isDeleting) {
            setShowDeleteDialog(true);
          }
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      {/* Thumbnail/Gradient Background */}
      <div 
        className="h-32 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent"
        style={project.thumbnail ? { 
          backgroundImage: `url(${project.thumbnail})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : undefined}
      />

      {/* Content */}
      <div className="p-5">
        {/* Title & Branch */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-display text-xl font-semibold text-foreground line-clamp-1">
            {project.title}
          </h3>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-xs text-secondary-foreground shrink-0">
            <GitBranch className="w-3 h-3" />
            <span>{project.branch}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {project.description}
        </p>

        {/* Stage Progress */}
        <div className="mb-4">
          {!inProduction ? (
            <>
              <div className="text-xs text-muted-foreground mb-2">
                Stage {project.currentStage} of {project.stages.length}
              </div>
              <div className="flex gap-1">
                {project.stages.map((stage, i) => (
                  <StageIndicator key={i} status={stage.status} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-2">
                  Narrative & Style Set
                </div>
                <div className="flex gap-1">
                  {project.stages.map((stage, i) => (
                    <StageIndicator key={i} status={stage.status} />
                  ))}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {project.sceneProgress!.currentSceneNumber !== null &&
                 project.sceneProgress!.completedScenes < project.sceneProgress!.totalScenes && (
                  <div className="mb-0.5">
                    Scene {project.sceneProgress!.currentSceneNumber}
                    {project.sceneProgress!.currentSceneStatus === 'outdated' || project.sceneProgress!.currentSceneStatus === 'continuity_broken'
                      ? `: ${project.sceneProgress!.currentSceneStatus === 'outdated' ? 'Outdated' : 'Continuity Broken'}`
                      : project.sceneProgress!.currentSceneStage !== null
                        ? `: Stage ${project.sceneProgress!.currentSceneStage}`
                        : ''}
                  </div>
                )}
                <div>
                  {project.sceneProgress!.completedScenes}/{project.sceneProgress!.totalScenes} Scenes Complete
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Updated {formatRelativeTime(project.updatedAt)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Open</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Delete Project
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{project.title}"? This action cannot be undone.
                All project data, scripts, and generated content will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'unknown';
  }
  
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return dateObj.toLocaleDateString();
}
