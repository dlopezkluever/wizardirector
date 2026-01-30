import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface RearviewMirrorProps {
  mode: 'text' | 'visual';
  priorSceneEndState?: string;
  priorEndFrame?: string;
  priorSceneName?: string;
  onImageError?: () => void;
}

export function RearviewMirror({ 
  mode, 
  priorSceneEndState, 
  priorEndFrame,
  priorSceneName,
  onImageError 
}: RearviewMirrorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (priorEndFrame) setImageLoading(true);
  }, [priorEndFrame]);

  if (!priorSceneEndState && !priorEndFrame) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-border/50 bg-card/30 backdrop-blur-sm"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-3 hover:bg-card/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Rearview Mirror
          </span>
          {priorSceneName && (
            <span className="text-xs text-muted-foreground">
              — Previous: {priorSceneName}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-6 pb-4"
        >
          {mode === 'text' && priorSceneEndState && (
            <div className="bg-background/50 rounded-lg p-4 border border-border/30">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {priorSceneEndState}
              </p>
            </div>
          )}

          {mode === 'visual' && priorEndFrame && (
            <div className="flex gap-4 items-start">
              <div className="relative group">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg min-w-[12rem] min-h-[7rem]">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <img
                  src={priorEndFrame}
                  alt={priorSceneName ? `Final frame from ${priorSceneName}` : 'Final frame from previous scene'}
                  className="w-48 h-28 object-cover rounded-lg border border-border/50"
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    onImageError?.();
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button variant="ghost" size="sm" className="text-white">
                    Compare
                  </Button>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Final Frame Reference
                </h4>
                <p className="text-xs text-muted-foreground">
                  Use this as your visual anchor for continuity. 
                  The new scene should flow naturally from this state.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
