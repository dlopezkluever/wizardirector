import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  Check,
  ArrowLeft,
  AlertTriangle,
  Image as ImageIcon,
  ListOrdered,
  Video,
  MessageSquare,
  Clock,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { VideoClip, IssueType } from '@/types/scene';

// Mock video clips
const mockClips: VideoClip[] = [
  { shotId: '1A', status: 'complete', duration: 8, videoUrl: '/placeholder.svg' },
  { shotId: '1B', status: 'complete', duration: 8, videoUrl: '/placeholder.svg' },
  { shotId: '1C', status: 'rendering', duration: 8 },
];

const issueTypes: { type: IssueType; label: string; icon: typeof AlertTriangle; returnStage: number }[] = [
  { type: 'visual-continuity', label: 'Visual Continuity', icon: ImageIcon, returnStage: 10 },
  { type: 'timing', label: 'Timing Issue', icon: Clock, returnStage: 7 },
  { type: 'dialogue-audio', label: 'Dialogue/Audio', icon: MessageSquare, returnStage: 9 },
  { type: 'narrative-structure', label: 'Narrative Structure', icon: ListOrdered, returnStage: 7 },
];

interface Stage12VideoGenerationProps {
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
  onReturnToStage: (stage: number) => void;
}

export function Stage12VideoGeneration({ 
  sceneId, 
  onComplete, 
  onBack, 
  onReturnToStage 
}: Stage12VideoGenerationProps) {
  const [clips, setClips] = useState<VideoClip[]>(mockClips);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState<IssueType | null>(null);
  const [showIssuePanel, setShowIssuePanel] = useState(false);

  const allComplete = clips.every(c => c.status === 'complete');
  const renderProgress = (clips.filter(c => c.status === 'complete').length / clips.length) * 100;
  const currentClip = clips[currentClipIndex];

  const handleIssueSelect = (type: IssueType) => {
    setSelectedIssue(type);
    const issue = issueTypes.find(i => i.type === type);
    if (issue) {
      onReturnToStage(issue.returnStage);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Video Generation & Review
            </h2>
            <p className="text-xs text-muted-foreground">
              {allComplete ? 'All clips rendered - review your scene' : 'Rendering in progress...'}
            </p>
          </div>
        </div>

        {!allComplete && (
          <div className="flex items-center gap-3">
            <div className="w-48">
              <Progress value={renderProgress} className="h-2" />
            </div>
            <span className="text-sm text-muted-foreground">
              {clips.filter(c => c.status === 'complete').length}/{clips.length} clips
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col"
        >
          {/* Player Area */}
          <div className="flex-1 flex items-center justify-center bg-black/50 p-8">
            <div className="w-full max-w-4xl">
              <div className="aspect-video bg-muted/20 rounded-xl border border-border/30 overflow-hidden relative">
                {currentClip?.status === 'complete' ? (
                  <>
                    <img 
                      src={currentClip.videoUrl} 
                      alt="Video preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-8 h-8 text-white" />
                        ) : (
                          <Play className="w-8 h-8 text-white ml-1" />
                        )}
                      </button>
                    </div>
                  </>
                ) : currentClip?.status === 'rendering' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
                    <span className="text-foreground font-medium">Rendering Shot {currentClip.shotId}...</span>
                    <span className="text-sm text-muted-foreground mt-1">This may take a few minutes</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Video className="w-12 h-12 text-muted-foreground mb-4" />
                    <span className="text-muted-foreground">Waiting to render</span>
                  </div>
                )}
              </div>

              {/* Player Controls */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentClipIndex(Math.max(0, currentClipIndex - 1))}
                  disabled={currentClipIndex === 0}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="gold"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!allComplete}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play Scene
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentClipIndex(Math.min(clips.length - 1, currentClipIndex + 1))}
                  disabled={currentClipIndex === clips.length - 1}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              {/* Clip Timeline */}
              <div className="mt-4 flex gap-2">
                {clips.map((clip, index) => (
                  <button
                    key={clip.shotId}
                    onClick={() => setCurrentClipIndex(index)}
                    className={cn(
                      'flex-1 h-12 rounded-lg border transition-all relative overflow-hidden',
                      currentClipIndex === index 
                        ? 'border-primary bg-primary/20' 
                        : 'border-border/30 bg-card/50 hover:border-border'
                    )}
                  >
                    {clip.status === 'complete' && clip.videoUrl && (
                      <img 
                        src={clip.videoUrl} 
                        alt=""
                        className="w-full h-full object-cover opacity-50"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {clip.status === 'rendering' ? (
                        <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                      ) : clip.status === 'complete' ? (
                        <Badge variant="outline" className="text-xs font-mono">
                          {clip.shotId}
                        </Badge>
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Issue Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col"
        >
          <div className="p-4 border-b border-border/50">
            <h3 className="font-display text-sm font-semibold text-foreground">
              Issue Resolution
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Found an issue? Select the type to return to the appropriate stage.
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {issueTypes.map(({ type, label, icon: Icon, returnStage }) => (
                <button
                  key={type}
                  onClick={() => handleIssueSelect(type)}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-all',
                    selectedIssue === type 
                      ? 'bg-destructive/10 border-destructive/30' 
                      : 'bg-card/50 border-border/30 hover:border-border'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn(
                      'w-5 h-5',
                      selectedIssue === type ? 'text-destructive' : 'text-muted-foreground'
                    )} />
                    <div>
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <p className="text-xs text-muted-foreground">
                        Return to Stage {returnStage}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/50 space-y-2">
            <Button
              variant="gold"
              className="w-full"
              onClick={onComplete}
              disabled={!allComplete}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Scene
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Returns to Script Hub
            </p>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-card/30">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Confirmation
        </Button>
      </div>
    </div>
  );
}
