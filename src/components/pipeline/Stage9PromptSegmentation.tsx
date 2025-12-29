import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Video,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowLeft,
  Edit3,
  Lock,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { PromptSet } from '@/types/scene';

// Mock prompt sets
const mockPromptSets: PromptSet[] = [
  {
    shotId: '1A',
    framePrompt: 'A 28-year-old woman with disheveled dark hair steps off a train onto an empty platform. She wears a worn leather jacket over a faded band t-shirt. Her face shows exhaustion. She clutches a battered leather suitcase. The platform is lit by flickering fluorescent lights. Dawn light filters through grimy windows. Wide shot, tracking left to right. 16:9 aspect ratio. Hyper-realistic, neo-noir aesthetic, muted colors with warm highlights.',
    videoPrompt: 'Maya steps off the train, pausing to take in the empty platform. Her footsteps echo. She adjusts her grip on the suitcase. Camera tracks smoothly from left to right. Ambient station sounds: distant hum of machinery, footsteps echoing. Duration: 8 seconds. Slow, deliberate movement.',
    requiresEndFrame: true,
    compatibleModels: ['Veo3', 'Runway Gen-3']
  },
  {
    shotId: '1B',
    framePrompt: 'Extreme close-up of Maya\'s face. Her dark eyes scan left to right. Slight furrow in her brow. Smudges under her eyes visible. Harsh fluorescent lighting creates sharp shadows. Static camera. 16:9 aspect ratio. Hyper-realistic, neo-noir aesthetic.',
    videoPrompt: 'Close-up: Maya\'s eyes dart across the platform, searching. A flicker of recognition crosses her face, then concern. Subtle facial performance, minimal head movement. Ambient station atmosphere. Duration: 8 seconds.',
    requiresEndFrame: false,
    compatibleModels: ['Veo3']
  },
  {
    shotId: '1C',
    framePrompt: 'Medium shot from behind Maya as she walks toward the station exit. Fluorescent lights flicker overhead. Her silhouette against distant dawn light. Worn suitcase in her right hand. Empty platform stretches behind her. 16:9 aspect ratio. Neo-noir aesthetic.',
    videoPrompt: 'DIALOGUE: MAYA (whispered): "Where is everyone?" Maya walks slowly toward the exit, footsteps echoing. Fluorescent lights flicker. Camera follows behind at steady pace. Echo on whispered dialogue. Duration: 8 seconds.',
    requiresEndFrame: true,
    compatibleModels: ['Veo3', 'Runway Gen-3']
  },
];

interface Stage9PromptSegmentationProps {
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage9PromptSegmentation({ sceneId, onComplete, onBack }: Stage9PromptSegmentationProps) {
  const [promptSets, setPromptSets] = useState<PromptSet[]>(mockPromptSets);
  const [expandedShots, setExpandedShots] = useState<string[]>([mockPromptSets[0].shotId]);
  const [editingPrompts, setEditingPrompts] = useState<Record<string, 'frame' | 'video' | null>>({});

  const toggleExpanded = (shotId: string) => {
    setExpandedShots(prev => 
      prev.includes(shotId) 
        ? prev.filter(id => id !== shotId)
        : [...prev, shotId]
    );
  };

  const handlePromptUpdate = (shotId: string, type: 'framePrompt' | 'videoPrompt', value: string) => {
    setPromptSets(prev => prev.map(ps => 
      ps.shotId === shotId ? { ...ps, [type]: value } : ps
    ));
  };

  const toggleEditing = (shotId: string, type: 'frame' | 'video') => {
    setEditingPrompts(prev => ({
      ...prev,
      [shotId]: prev[shotId] === type ? null : type
    }));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Prompt Segmentation
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Review and edit prompts for frame and video generation
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>Frame prompts are read-only by default</span>
          </div>
        </div>
      </div>

      {/* Prompt Cards */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {promptSets.map((promptSet, index) => {
            const isExpanded = expandedShots.includes(promptSet.shotId);
            const isEditingFrame = editingPrompts[promptSet.shotId] === 'frame';
            const isEditingVideo = editingPrompts[promptSet.shotId] === 'video';

            return (
              <motion.div
                key={promptSet.shotId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card/50 rounded-xl border border-border/30 overflow-hidden"
              >
                {/* Shot Header */}
                <button
                  onClick={() => toggleExpanded(promptSet.shotId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      Shot {promptSet.shotId}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-blue-500/20 text-blue-400 text-xs"
                      >
                        <ImageIcon className="w-3 h-3 mr-1" />
                        Frame
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className="bg-purple-500/20 text-purple-400 text-xs"
                      >
                        <Video className="w-3 h-3 mr-1" />
                        Video
                      </Badge>
                      {promptSet.requiresEndFrame && (
                        <Badge 
                          variant="secondary" 
                          className="bg-amber-500/20 text-amber-400 text-xs"
                        >
                          End Frame Required
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t border-border/30"
                  >
                    <div className="p-4 space-y-4">
                      {/* Frame Prompt */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-blue-400" />
                            Frame Prompt
                            <span className="text-xs text-muted-foreground">(Image Generation)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Allow Edit</span>
                            <Switch
                              checked={isEditingFrame}
                              onCheckedChange={() => toggleEditing(promptSet.shotId, 'frame')}
                            />
                          </div>
                        </div>
                        <div className={cn(
                          'relative rounded-lg border transition-colors',
                          isEditingFrame ? 'border-blue-500/50' : 'border-border/30 bg-muted/20'
                        )}>
                          <Textarea
                            value={promptSet.framePrompt}
                            onChange={(e) => handlePromptUpdate(promptSet.shotId, 'framePrompt', e.target.value)}
                            disabled={!isEditingFrame}
                            rows={4}
                            className={cn(
                              'resize-none',
                              !isEditingFrame && 'cursor-not-allowed opacity-80'
                            )}
                          />
                          {!isEditingFrame && (
                            <div className="absolute top-2 right-2">
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Video Prompt */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Video className="w-4 h-4 text-purple-400" />
                            Video Prompt
                            <span className="text-xs text-muted-foreground">(Video Generation)</span>
                          </label>
                          <Badge variant="outline" className="text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Always Editable
                          </Badge>
                        </div>
                        <Textarea
                          value={promptSet.videoPrompt}
                          onChange={(e) => handlePromptUpdate(promptSet.shotId, 'videoPrompt', e.target.value)}
                          rows={4}
                          className="border-purple-500/30 focus:border-purple-500/50"
                        />
                      </div>

                      {/* Model Compatibility */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Compatible Models:</span>
                          {promptSet.compatibleModels.map(model => (
                            <Badge key={model} variant="outline" className="text-xs">
                              {model}
                            </Badge>
                          ))}
                        </div>
                        {promptSet.framePrompt.length > 500 && (
                          <div className="flex items-center gap-1 text-amber-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs">Prompt may be verbose</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card/30">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Visuals
        </Button>
        <Button variant="gold" onClick={onComplete}>
          <Check className="w-4 h-4 mr-2" />
          Proceed to Frame Generation
        </Button>
      </div>
    </div>
  );
}
