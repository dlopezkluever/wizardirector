import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Users,
  MapPin,
  GitBranch,
  ArrowUp,
  Loader2,
  Play,
  Eye,
  EyeOff,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatSceneHeader } from '@/lib/utils';
import { toast } from 'sonner';
import { sceneService } from '@/lib/services/sceneService';
import { checkoutService } from '@/lib/services/checkoutService';
import type { Scene, SceneStatus, ContinuityRisk } from '@/types/scene';
import { ContentAccessCarousel } from './ContentAccessCarousel';

const statusConfig: Record<SceneStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  'draft': { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: Clock },
  'shot_list_ready': { label: 'Shot List', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  'frames_locked': { label: 'Frames Ready', color: 'bg-amber-500/20 text-amber-400', icon: ImageIcon },
  'video_complete': { label: 'Complete', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  'outdated': { label: 'Outdated', color: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
  'continuity_broken': { label: 'Broken', color: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
};

const riskConfig: Record<ContinuityRisk, { label: string; color: string }> = {
  'safe': { label: 'Safe', color: 'text-emerald-400' },
  'risky': { label: 'Risky', color: 'text-amber-400' },
  'broken': { label: 'Broken', color: 'text-destructive' },
};

interface Stage6ScriptHubProps {
  onEnterScene: (sceneId: string) => void;
  onEnterSceneAtStage?: (sceneId: string, stage: number) => void;
  onBack: () => void;
}

export function Stage6ScriptHub({ onEnterScene, onEnterSceneAtStage, onBack }: Stage6ScriptHubProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [showOutdatedWarning, setShowOutdatedWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderStatuses, setRenderStatuses] = useState<Record<string, string>>({});
  const [isDeferring, setIsDeferring] = useState(false);

  // Fetch scenes on mount
  useEffect(() => {
    const loadScenes = async () => {
      if (!projectId) {
        setError('Project ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const fetchedScenes = await sceneService.fetchScenes(projectId);
        
        // Transform scenes to ensure all fields are properly set
        const transformedScenes = fetchedScenes.map((scene): Scene => ({
          ...scene,
          // Ensure expectedCharacters defaults to empty array if not provided
          expectedCharacters: scene.expectedCharacters || [],
          // Ensure expectedLocation defaults to empty string if not provided
          expectedLocation: scene.expectedLocation || '',
          // Ensure shots defaults to empty array if not provided
          shots: scene.shots || [],
        }));

        setScenes(transformedScenes);
        
        // Auto-select first scene if available
        if (transformedScenes.length > 0) {
          setSelectedScene(transformedScenes[0]);
        }
      } catch (err) {
        console.error('Failed to fetch scenes:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load scenes';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadScenes();
  }, [projectId]);

  // Fetch batch render statuses for all scenes
  useEffect(() => {
    const loadRenderStatuses = async () => {
      if (!projectId || scenes.length === 0) return;
      try {
        const statuses = await checkoutService.getBatchRenderStatus(projectId);
        setRenderStatuses(statuses);
      } catch {
        // Non-critical - silently fail
      }
    };

    loadRenderStatuses();
    // Poll render statuses every 10 seconds
    const interval = setInterval(loadRenderStatuses, 10000);
    return () => clearInterval(interval);
  }, [projectId, scenes.length]);

  const handleReviewVideo = (sceneId: string) => {
    if (onEnterSceneAtStage) {
      onEnterSceneAtStage(sceneId, 12);
    } else {
      onEnterScene(sceneId);
    }
  };

  const handleSceneClick = (scene: Scene) => {
    setSelectedScene(scene);
    if (scene.status === 'outdated') {
      setShowOutdatedWarning(true);
    }
  };

  const handleEnterPipeline = () => {
    if (selectedScene) {
      setShowOutdatedWarning(false);
      onEnterScene(selectedScene.id);
    }
  };

  const handleDeferScene = async () => {
    if (!projectId || !selectedScene) return;
    try {
      setIsDeferring(true);
      await sceneService.deferScene(projectId, selectedScene.id);
      setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, isDeferred: true } : s));
      setSelectedScene(prev => prev ? { ...prev, isDeferred: true } : null);
      toast.success(`Scene ${selectedScene.sceneNumber} deferred`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to defer scene');
    } finally {
      setIsDeferring(false);
    }
  };

  const handleRestoreScene = async () => {
    if (!projectId || !selectedScene) return;
    try {
      setIsDeferring(true);
      await sceneService.restoreScene(projectId, selectedScene.id);
      setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, isDeferred: false } : s));
      setSelectedScene(prev => prev ? { ...prev, isDeferred: false } : null);
      toast.success(`Scene ${selectedScene.sceneNumber} restored`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restore scene');
    } finally {
      setIsDeferring(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Scene Index - Left Panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-80 border-r border-border/50 bg-card/30 backdrop-blur-sm flex flex-col"
      >
        <div className="p-4 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Script Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : (
              <>
                {scenes.filter(s => !s.isDeferred).length} scenes
                {scenes.filter(s => s.isDeferred).length > 0 && (
                  <> · {scenes.filter(s => s.isDeferred).length} deferred</>
                )}
                {' '}· {scenes.filter(s => s.status === 'video_complete').length} complete
              </>
            )}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
                <p className="text-sm text-muted-foreground text-center">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    if (projectId) {
                      setIsLoading(true);
                      setError(null);
                      sceneService.fetchScenes(projectId)
                        .then((fetchedScenes) => {
                          const transformedScenes = fetchedScenes.map((scene): Scene => ({
                            ...scene,
                            expectedCharacters: scene.expectedCharacters || [],
                            expectedLocation: scene.expectedLocation || '',
                            shots: scene.shots || [],
                          }));
                          setScenes(transformedScenes);
                          if (transformedScenes.length > 0) {
                            setSelectedScene(transformedScenes[0]);
                          }
                        })
                        .catch((err) => {
                          const errorMessage = err instanceof Error ? err.message : 'Failed to load scenes';
                          setError(errorMessage);
                          toast.error(errorMessage);
                        })
                        .finally(() => setIsLoading(false));
                    }
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : scenes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Film className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  No scenes found. Extract scenes from Stage 4 to get started.
                </p>
              </div>
            ) : (
              scenes.map((scene) => {
              const StatusIcon = statusConfig[scene.status].icon;
              const isSelected = selectedScene?.id === scene.id;

              return (
                <motion.button
                  key={scene.id}
                  onClick={() => handleSceneClick(scene)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'w-full p-3 rounded-lg mb-2 text-left transition-all',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-card/50 border border-border/30 hover:border-border',
                    scene.isDeferred && 'opacity-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-10 rounded bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {scene.endFrameThumbnail ? (
                        <img 
                          src={scene.endFrameThumbnail} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 overflow-hidden">
                        <span className="text-xs font-mono text-primary flex-shrink-0">
                          {String(scene.sceneNumber).padStart(2, '0')}
                        </span>
                        <span
                          className="text-sm font-medium text-foreground truncate"
                          title={formatSceneHeader(scene.slug).formatted}
                        >
                          {formatSceneHeader(scene.slug).formatted}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {scene.isDeferred && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground"
                          >
                            <EyeOff className="w-3 h-3 mr-1" />
                            Deferred
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px] px-1.5 py-0', statusConfig[scene.status].color)}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[scene.status].label}
                        </Badge>
                        
                        {renderStatuses[scene.id] === 'complete' && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 animate-pulse"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Review Ready
                          </Badge>
                        )}
                        {renderStatuses[scene.id] === 'rendering' && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400"
                          >
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Rendering
                          </Badge>
                        )}
                        {scene.continuityRisk && scene.continuityRisk !== 'safe' && (
                          <span className={cn('text-[10px]', riskConfig[scene.continuityRisk].color)}>
                            ⚠ {riskConfig[scene.continuityRisk].label}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className={cn(
                      'w-4 h-4 transition-colors flex-shrink-0',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                </motion.button>
              );
            })
            )}
          </div>
        </ScrollArea>
      </motion.div>

      {/* Scene Overview - Main Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {selectedScene ? (
          <>
            {/* Scene Header */}
            <div className="p-6 border-b border-border/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-mono text-primary font-bold">
                      {String(selectedScene.sceneNumber).padStart(2, '0')}
                    </span>
                    <h1 className="font-display text-2xl font-bold text-foreground">
                      {formatSceneHeader(selectedScene.slug).formatted}
                    </h1>
                    <Badge 
                      variant="secondary" 
                      className={cn('ml-2', statusConfig[selectedScene.status].color)}
                    >
                      {statusConfig[selectedScene.status].label}
                    </Badge>
                  </div>
                  <p className="font-mono text-sm text-muted-foreground">
                    {selectedScene.header}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={onBack}
                  >
                    <ArrowUp className="w-4 h-4 mr-1" />
                    Narrative & Style Engine
                  </Button>
                  {selectedScene.isDeferred ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestoreScene}
                      disabled={isDeferring}
                    >
                      {isDeferring ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Undo2 className="w-4 h-4 mr-1" />}
                      Restore Scene
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeferScene}
                      disabled={isDeferring}
                    >
                      {isDeferring ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <EyeOff className="w-4 h-4 mr-1" />}
                      Defer Scene
                    </Button>
                  )}
                  {renderStatuses[selectedScene.id] === 'complete' && (
                    <Button
                      variant="outline"
                      onClick={() => handleReviewVideo(selectedScene.id)}
                      className="border-blue-400/30 text-blue-400 hover:bg-blue-500/10"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Review Video
                    </Button>
                  )}
                  <Button
                    variant="gold"
                    onClick={handleEnterPipeline}
                    disabled={selectedScene.isDeferred}
                  >
                    Enter Scene Pipeline
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Scene Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Opening Action */}
                <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                  <h3 className="text-sm font-medium text-foreground mb-2">Opening Action</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedScene.openingAction}
                  </p>
                </div>

                {/* Scene Dependencies */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Scene Dependencies
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">Expected Characters</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedScene.expectedCharacters && selectedScene.expectedCharacters.length > 0 ? (
                          selectedScene.expectedCharacters.map(char => (
                            <Badge key={char} variant="outline" className="text-xs">
                              {char}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Not yet extracted</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">Expected Location</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedScene.expectedLocation || 'Not yet extracted'}
                      </p>
                    </div>

                    <div className="bg-card/50 rounded-lg p-4 border border-border/30 col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">Expected Props</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedScene.expectedProps && selectedScene.expectedProps.length > 0 ? (
                          selectedScene.expectedProps.map((prop, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {prop}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Not yet extracted</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Access Carousel */}
                {projectId && (
                  <ContentAccessCarousel
                    projectId={projectId}
                    sceneId={selectedScene.id}
                    stageNumber={6}
                    sceneNumber={selectedScene.sceneNumber}
                  />
                )}

                {/* Continuity Risk Warning */}
                {selectedScene.continuityRisk && selectedScene.continuityRisk !== 'safe' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'rounded-lg p-4 border',
                      selectedScene.continuityRisk === 'risky' 
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-destructive/10 border-destructive/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={cn(
                        'w-5 h-5 flex-shrink-0',
                        selectedScene.continuityRisk === 'risky' ? 'text-amber-400' : 'text-destructive'
                      )} />
                      <div>
                        <h4 className={cn(
                          'text-sm font-medium',
                          selectedScene.continuityRisk === 'risky' ? 'text-amber-400' : 'text-destructive'
                        )}>
                          Continuity {riskConfig[selectedScene.continuityRisk].label}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedScene.continuityRisk === 'risky' 
                            ? 'Prior scene end-state metadata shows potential continuity issues with this scene\'s opening requirements.'
                            : 'Upstream artifacts have changed. This scene and all downstream scenes may need to be regenerated.'
                          }
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Select a scene to view details</p>
          </div>
        )}
      </motion.div>

      {/* Outdated Warning Modal */}
      <AnimatePresence>
        {showOutdatedWarning && selectedScene && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowOutdatedWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 max-w-md mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Scene Outdated
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Scene {selectedScene.sceneNumber}: {selectedScene.slug}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-muted-foreground">
                  This scene is marked as <strong className="text-destructive">outdated</strong> because upstream artifacts have changed.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Previous scene scripts were modified</li>
                  <li>Downstream scenes may be affected</li>
                  <li>Re-generation may be required</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowOutdatedWarning(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="gold" 
                  className="flex-1"
                  onClick={handleEnterPipeline}
                >
                  Proceed Anyway
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
