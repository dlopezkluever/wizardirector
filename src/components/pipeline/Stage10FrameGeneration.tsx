import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image as ImageIcon, 
  RefreshCw,
  Check,
  X,
  ArrowLeft,
  Zap,
  Shield,
  ChevronRight,
  Eye,
  Paintbrush
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RearviewMirror } from './RearviewMirror';
import { sceneService } from '@/lib/services/sceneService';
import { cn } from '@/lib/utils';
import type { FramePair } from '@/types/scene';

type GenerationMode = 'quick' | 'control';

// Mock frame pairs
const mockFramePairs: FramePair[] = [
  {
    shotId: '1A',
    startFrame: '/placeholder.svg',
    endFrame: '/placeholder.svg',
    startFrameStatus: 'approved',
    endFrameStatus: 'approved',
  },
  {
    shotId: '1B',
    startFrame: '/placeholder.svg',
    startFrameStatus: 'approved',
    endFrameStatus: 'pending',
  },
  {
    shotId: '1C',
    startFrameStatus: 'pending',
    endFrameStatus: 'pending',
  },
];

interface Stage10FrameGenerationProps {
  projectId: string;
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage10FrameGeneration({ projectId, sceneId, onComplete, onBack }: Stage10FrameGenerationProps) {
  const [mode, setMode] = useState<GenerationMode>('control');
  const [framePairs, setFramePairs] = useState<FramePair[]>(mockFramePairs);
  const [selectedShot, setSelectedShot] = useState<string>(mockFramePairs[0].shotId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInpainting, setShowInpainting] = useState(false);

  const [priorSceneData, setPriorSceneData] = useState<{
    endState?: string;
    endFrame?: string;
    sceneNumber?: number;
  } | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchPriorScene = async () => {
      try {
        const scenes = await sceneService.fetchScenes(projectId);
        const currentSceneIndex = scenes.findIndex(s => s.id === sceneId);
        if (currentSceneIndex > 0) {
          const priorScene = scenes[currentSceneIndex - 1];
          setPriorSceneData({
            endState: priorScene.priorSceneEndState,
            endFrame: priorScene.endFrameThumbnail,
            sceneNumber: priorScene.sceneNumber
          });
          setImageError(false);
        }
      } catch (error) {
        console.error('Failed to fetch prior scene:', error);
      }
    };
    fetchPriorScene();
  }, [projectId, sceneId]);

  const selectedPair = framePairs.find(fp => fp.shotId === selectedShot);

  const handleGenerateFrame = async (shotId: string, type: 'start' | 'end') => {
    setIsGenerating(true);
    const statusKey = type === 'start' ? 'startFrameStatus' : 'endFrameStatus';
    const frameKey = type === 'start' ? 'startFrame' : 'endFrame';
    
    setFramePairs(prev => prev.map(fp => 
      fp.shotId === shotId ? { ...fp, [statusKey]: 'generating' } : fp
    ));
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setFramePairs(prev => prev.map(fp => 
      fp.shotId === shotId 
        ? { ...fp, [statusKey]: 'approved', [frameKey]: '/placeholder.svg' } 
        : fp
    ));
    
    setIsGenerating(false);
  };

  const handleApproveFrame = (shotId: string, type: 'start' | 'end') => {
    const statusKey = type === 'start' ? 'startFrameStatus' : 'endFrameStatus';
    setFramePairs(prev => prev.map(fp => 
      fp.shotId === shotId ? { ...fp, [statusKey]: 'approved' } : fp
    ));
  };

  const handleRejectFrame = (shotId: string, type: 'start' | 'end') => {
    const statusKey = type === 'start' ? 'startFrameStatus' : 'endFrameStatus';
    const frameKey = type === 'start' ? 'startFrame' : 'endFrame';
    setFramePairs(prev => prev.map(fp => 
      fp.shotId === shotId ? { ...fp, [statusKey]: 'pending', [frameKey]: undefined } : fp
    ));
  };

  const allFramesApproved = framePairs.every(fp => 
    fp.startFrameStatus === 'approved' && 
    (fp.endFrameStatus === 'approved' || fp.endFrameStatus === 'pending')
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Rearview Mirror */}
      <RearviewMirror
        mode={priorSceneData?.endFrame && !imageError ? 'visual' : 'text'}
        priorSceneEndState={priorSceneData?.endState}
        priorEndFrame={priorSceneData?.endFrame}
        priorSceneName={priorSceneData?.sceneNumber ? `Scene ${priorSceneData.sceneNumber}` : undefined}
        onImageError={() => setImageError(true)}
      />

      {/* Mode Selection */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Frame Generation
          </h2>
          
          <div className="flex items-center gap-2 bg-card/50 rounded-lg p-1">
            <button
              onClick={() => setMode('quick')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                mode === 'quick' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Zap className="w-4 h-4" />
              Quick Mode
            </button>
            <button
              onClick={() => setMode('control')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                mode === 'control' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Shield className="w-4 h-4" />
              Control Mode
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {mode === 'quick' 
            ? 'Bulk generate all frames at once (faster)' 
            : 'Approve each frame before proceeding (cost-efficient)'
          }
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Shot List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-sm"
        >
          <ScrollArea className="h-full">
            <div className="p-2">
              {framePairs.map((pair) => {
                const isSelected = selectedShot === pair.shotId;
                const startReady = pair.startFrameStatus === 'approved';
                const endReady = pair.endFrameStatus === 'approved';
                
                return (
                  <motion.button
                    key={pair.shotId}
                    onClick={() => setSelectedShot(pair.shotId)}
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      'w-full p-3 rounded-lg mb-2 text-left transition-all',
                      isSelected 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-card/50 border border-border/30 hover:border-border'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="font-mono">
                        Shot {pair.shotId}
                      </Badge>
                      <ChevronRight className={cn(
                        'w-4 h-4',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    
                    <div className="flex gap-2">
                      <div className={cn(
                        'flex-1 h-12 rounded border flex items-center justify-center',
                        startReady 
                          ? 'border-emerald-500/50 bg-emerald-500/10' 
                          : 'border-border/30 bg-muted/20'
                      )}>
                        {pair.startFrame ? (
                          <img src={pair.startFrame} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Start</span>
                        )}
                      </div>
                      <div className={cn(
                        'flex-1 h-12 rounded border flex items-center justify-center',
                        endReady 
                          ? 'border-emerald-500/50 bg-emerald-500/10' 
                          : 'border-border/30 bg-muted/20'
                      )}>
                        {pair.endFrame ? (
                          <img src={pair.endFrame} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">End</span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </ScrollArea>
        </motion.div>

        {/* Frame Editor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {selectedPair && (
            <ScrollArea className="flex-1">
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Start Frame */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-foreground">Start Frame</h3>
                      <Badge 
                        variant="secondary"
                        className={cn(
                          selectedPair.startFrameStatus === 'approved' && 'bg-emerald-500/20 text-emerald-400',
                          selectedPair.startFrameStatus === 'generating' && 'bg-blue-500/20 text-blue-400',
                          selectedPair.startFrameStatus === 'pending' && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {selectedPair.startFrameStatus === 'generating' && (
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        )}
                        {selectedPair.startFrameStatus}
                      </Badge>
                    </div>
                    
                    <div className="aspect-video bg-muted/50 rounded-lg border border-border/30 overflow-hidden relative group">
                      {selectedPair.startFrame ? (
                        <>
                          <img 
                            src={selectedPair.startFrame} 
                            alt="Start frame"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button 
                              variant="glass" 
                              size="sm"
                              onClick={() => setShowInpainting(true)}
                            >
                              <Paintbrush className="w-4 h-4 mr-1" />
                              Inpaint
                            </Button>
                            <Button variant="glass" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              Compare
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">No frame generated</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      {selectedPair.startFrame ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleRejectFrame(selectedPair.shotId, 'start')}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button 
                            variant="gold" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleApproveFrame(selectedPair.shotId, 'start')}
                            disabled={selectedPair.startFrameStatus === 'approved'}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {selectedPair.startFrameStatus === 'approved' ? 'Approved' : 'Approve'}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="gold" 
                          className="w-full"
                          disabled={isGenerating}
                          onClick={() => handleGenerateFrame(selectedPair.shotId, 'start')}
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Generate Start Frame
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* End Frame */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-foreground">End Frame</h3>
                      <Badge 
                        variant="secondary"
                        className={cn(
                          selectedPair.endFrameStatus === 'approved' && 'bg-emerald-500/20 text-emerald-400',
                          selectedPair.endFrameStatus === 'generating' && 'bg-blue-500/20 text-blue-400',
                          selectedPair.endFrameStatus === 'pending' && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {selectedPair.endFrameStatus === 'generating' && (
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        )}
                        {selectedPair.endFrameStatus}
                      </Badge>
                    </div>
                    
                    <div className="aspect-video bg-muted/50 rounded-lg border border-border/30 overflow-hidden relative group">
                      {selectedPair.endFrame ? (
                        <>
                          <img 
                            src={selectedPair.endFrame} 
                            alt="End frame"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button 
                              variant="glass" 
                              size="sm"
                              onClick={() => setShowInpainting(true)}
                            >
                              <Paintbrush className="w-4 h-4 mr-1" />
                              Inpaint
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            {selectedPair.startFrameStatus !== 'approved' 
                              ? 'Approve start frame first' 
                              : 'No frame generated'
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      {selectedPair.endFrame ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleRejectFrame(selectedPair.shotId, 'end')}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button 
                            variant="gold" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleApproveFrame(selectedPair.shotId, 'end')}
                            disabled={selectedPair.endFrameStatus === 'approved'}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {selectedPair.endFrameStatus === 'approved' ? 'Approved' : 'Approve'}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="gold" 
                          className="w-full"
                          disabled={isGenerating || selectedPair.startFrameStatus !== 'approved'}
                          onClick={() => handleGenerateFrame(selectedPair.shotId, 'end')}
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Generate End Frame
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card/30">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Prompts
        </Button>
        <Button variant="gold" onClick={onComplete} disabled={!allFramesApproved}>
          <Check className="w-4 h-4 mr-2" />
          Proceed to Confirmation
        </Button>
      </div>

      {/* Inpainting Modal */}
      <AnimatePresence>
        {showInpainting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowInpainting(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 max-w-2xl mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <Paintbrush className="w-6 h-6 text-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Region Inpainting
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Select a region to edit with a localized prompt. 
                This allows you to fix continuity breaks without regenerating the entire frame.
              </p>
              <div className="aspect-video bg-muted/50 rounded-lg border border-border/30 mb-4 flex items-center justify-center">
                <span className="text-muted-foreground">Draw selection on image</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowInpainting(false)}>
                  Cancel
                </Button>
                <Button variant="gold" className="flex-1">
                  Apply Inpainting
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
