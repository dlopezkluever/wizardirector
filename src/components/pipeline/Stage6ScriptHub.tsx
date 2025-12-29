import { useState } from 'react';
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
  ArrowUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Scene, SceneStatus, ContinuityRisk } from '@/types/scene';

// Mock scenes data
const mockScenes: Scene[] = [
  {
    id: 'scene-1',
    sceneNumber: 1,
    slug: 'The Arrival',
    status: 'video-complete',
    header: 'INT. TRAIN STATION - DAWN',
    openingAction: 'MAYA (28), disheveled and weary, steps off the last train of the night. The platform is empty save for flickering fluorescent lights.',
    expectedCharacters: ['Maya'],
    expectedLocation: 'Train Station - Platform',
    endFrameThumbnail: '/placeholder.svg',
    shots: [],
    continuityRisk: 'safe'
  },
  {
    id: 'scene-2',
    sceneNumber: 2,
    slug: 'The Discovery',
    status: 'frames-locked',
    header: 'EXT. CITY STREET - CONTINUOUS',
    openingAction: 'Maya exits the station into a rain-soaked street. She notices something unusual in the reflection of a puddle.',
    expectedCharacters: ['Maya'],
    expectedLocation: 'City Street - Night',
    priorSceneEndState: 'Maya walks toward the station exit, her silhouette framed against the dawn light.',
    shots: [],
    continuityRisk: 'safe'
  },
  {
    id: 'scene-3',
    sceneNumber: 3,
    slug: 'The Confrontation',
    status: 'shot-list-locked',
    header: 'INT. ABANDONED WAREHOUSE - NIGHT',
    openingAction: 'The warehouse doors creak open. Maya enters, her footsteps echoing in the vast empty space.',
    expectedCharacters: ['Maya', 'The Stranger'],
    expectedLocation: 'Abandoned Warehouse',
    priorSceneEndState: 'Maya follows the mysterious figure into the warehouse district.',
    shots: [],
    continuityRisk: 'risky'
  },
  {
    id: 'scene-4',
    sceneNumber: 4,
    slug: 'The Revelation',
    status: 'draft',
    header: 'INT. WAREHOUSE - UPPER LEVEL - CONTINUOUS',
    openingAction: 'Moonlight streams through broken windows. THE STRANGER steps from the shadows.',
    expectedCharacters: ['Maya', 'The Stranger'],
    expectedLocation: 'Warehouse Upper Level',
    shots: [],
    continuityRisk: 'broken'
  },
  {
    id: 'scene-5',
    sceneNumber: 5,
    slug: 'The Escape',
    status: 'outdated',
    header: 'EXT. ROOFTOP - NIGHT',
    openingAction: 'Maya bursts through the rooftop access door, gasping for breath.',
    expectedCharacters: ['Maya'],
    expectedLocation: 'Warehouse Rooftop',
    shots: [],
    continuityRisk: 'broken'
  },
];

const statusConfig: Record<SceneStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  'draft': { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: Clock },
  'shot-list-locked': { label: 'Shot List', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  'frames-locked': { label: 'Frames Ready', color: 'bg-amber-500/20 text-amber-400', icon: ImageIcon },
  'video-complete': { label: 'Complete', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  'outdated': { label: 'Outdated', color: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
};

const riskConfig: Record<ContinuityRisk, { label: string; color: string }> = {
  'safe': { label: 'Safe', color: 'text-emerald-400' },
  'risky': { label: 'Risky', color: 'text-amber-400' },
  'broken': { label: 'Broken', color: 'text-destructive' },
};

interface Stage6ScriptHubProps {
  onEnterScene: (sceneId: string) => void;
  onBack: () => void;
}

export function Stage6ScriptHub({ onEnterScene, onBack }: Stage6ScriptHubProps) {
  const [selectedScene, setSelectedScene] = useState<Scene | null>(mockScenes[0]);
  const [showOutdatedWarning, setShowOutdatedWarning] = useState(false);

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
            {mockScenes.length} scenes • {mockScenes.filter(s => s.status === 'video-complete').length} complete
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {mockScenes.map((scene) => {
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
                      : 'bg-card/50 border border-border/30 hover:border-border'
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
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-primary">
                          {String(scene.sceneNumber).padStart(2, '0')}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">
                          {scene.slug}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={cn('text-[10px] px-1.5 py-0', statusConfig[scene.status].color)}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[scene.status].label}
                        </Badge>
                        
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
            })}
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
                      {selectedScene.slug}
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
                    Phase A
                  </Button>
                  <Button
                    variant="gold"
                    onClick={handleEnterPipeline}
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
                        {selectedScene.expectedCharacters.map(char => (
                          <Badge key={char} variant="outline" className="text-xs">
                            {char}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">Expected Location</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedScene.expectedLocation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prior Scene End State */}
                {selectedScene.priorSceneEndState && (
                  <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      Prior Scene End State
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedScene.priorSceneEndState}
                    </p>
                  </div>
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
