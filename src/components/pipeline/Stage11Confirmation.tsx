import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Image as ImageIcon, 
  Play,
  Check,
  ArrowLeft,
  AlertTriangle,
  Coins,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SceneCheckout } from '@/types/scene';

// Mock checkout data
const mockCheckout: SceneCheckout = {
  sceneId: 'scene-1',
  shots: [
    {
      shotId: '1A',
      startFrame: '/placeholder.svg',
      endFrame: '/placeholder.svg',
      prompt: 'Maya steps off the train, pausing to take in the empty platform...',
      creditCost: 15,
    },
    {
      shotId: '1B',
      startFrame: '/placeholder.svg',
      prompt: 'Close-up: Maya\'s eyes dart across the platform, searching...',
      creditCost: 12,
    },
    {
      shotId: '1C',
      startFrame: '/placeholder.svg',
      endFrame: '/placeholder.svg',
      prompt: 'DIALOGUE: MAYA: "Where is everyone?" Maya walks slowly...',
      creditCost: 18,
    },
  ],
  totalCreditCost: 45,
};

interface Stage11ConfirmationProps {
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage11Confirmation({ sceneId, onComplete, onBack }: Stage11ConfirmationProps) {
  const [checkout] = useState<SceneCheckout>(mockCheckout);
  const [expandedShots, setExpandedShots] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  const toggleExpanded = (shotId: string) => {
    setExpandedShots(prev => 
      prev.includes(shotId) 
        ? prev.filter(id => id !== shotId)
        : [...prev, shotId]
    );
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    onComplete();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Confirm & Render
            </h2>
            <p className="text-sm text-muted-foreground">
              Review your scene before video generation
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Shot Summary */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {checkout.shots.map((shot, index) => {
              const isExpanded = expandedShots.includes(shot.shotId);
              
              return (
                <motion.div
                  key={shot.shotId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card/50 rounded-xl border border-border/30 overflow-hidden"
                >
                  <div 
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => toggleExpanded(shot.shotId)}
                  >
                    {/* Frame Previews */}
                    <div className="flex gap-2">
                      <div className="w-20 h-12 rounded border border-border/30 overflow-hidden bg-muted/50">
                        {shot.startFrame ? (
                          <img src={shot.startFrame} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {shot.endFrame && (
                        <div className="w-20 h-12 rounded border border-border/30 overflow-hidden bg-muted/50">
                          <img src={shot.endFrame} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Shot Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">
                          Shot {shot.shotId}
                        </Badge>
                        <span className="text-xs text-muted-foreground">8 seconds</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {shot.prompt}
                      </p>
                    </div>

                    {/* Cost */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-primary">
                          <Coins className="w-4 h-4" />
                          <span className="font-mono font-bold">{shot.creditCost}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">credits</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-border/30 p-4"
                    >
                      <h4 className="text-sm font-medium text-foreground mb-2">Video Prompt</h4>
                      <p className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
                        {shot.prompt}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Cost Summary Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col"
        >
          <div className="p-6 border-b border-border/50">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">
              Cost Summary
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Shots</span>
                <span className="font-medium text-foreground">{checkout.shots.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Duration</span>
                <span className="font-medium text-foreground">{checkout.shots.length * 8}s</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Frame Pairs</span>
                <span className="font-medium text-foreground">
                  {checkout.shots.filter(s => s.endFrame).length + checkout.shots.length}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 flex-1">
            <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Total Credit Cost</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-primary">
                  {checkout.totalCreditCost}
                </span>
                <span className="text-muted-foreground">credits</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Estimated render time: ~5 minutes</span>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 border-t border-border/50">
            <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/30 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">
                  No further edits are possible after confirmation. 
                  Make sure all frames and prompts are correct.
                </p>
              </div>
            </div>

            <Button 
              variant="gold" 
              className="w-full"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <Play className="w-4 h-4 mr-2 animate-pulse" />
                  Queueing Render...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Confirm & Render
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-card/30">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Frames
        </Button>
      </div>
    </div>
  );
}
