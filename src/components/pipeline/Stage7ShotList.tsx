import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Split, 
  Merge, 
  ChevronRight,
  Clock,
  Users,
  Camera,
  MapPin,
  MessageSquare,
  Zap,
  Check,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RearviewMirror } from './RearviewMirror';
import { cn } from '@/lib/utils';
import type { Shot } from '@/types/scene';

// Mock shots data
const mockShots: Shot[] = [
  {
    id: 'shot-1',
    sceneId: 'scene-1',
    shotId: '1A',
    duration: 8,
    dialogue: '',
    action: 'MAYA steps off the train, her worn suitcase clutched in one hand. She pauses on the platform, taking in the empty station.',
    charactersForeground: ['Maya'],
    charactersBackground: [],
    setting: 'Train Platform - Dawn',
    camera: 'Wide shot, tracking left to right',
    beatReference: 'Beat 1: The Arrival'
  },
  {
    id: 'shot-2',
    sceneId: 'scene-1',
    shotId: '1B',
    duration: 8,
    dialogue: '',
    action: 'Close-up of Maya\'s face as her eyes scan the platform. A flicker of recognition, then concern.',
    charactersForeground: ['Maya'],
    charactersBackground: [],
    setting: 'Train Platform - Dawn',
    camera: 'Close-up, static',
    beatReference: 'Beat 1: The Arrival'
  },
  {
    id: 'shot-3',
    sceneId: 'scene-1',
    shotId: '1C',
    duration: 8,
    dialogue: 'MAYA: (whispered) Where is everyone?',
    action: 'Maya walks slowly toward the exit, her footsteps echoing. The fluorescent lights flicker overhead.',
    charactersForeground: ['Maya'],
    charactersBackground: [],
    setting: 'Train Platform - Dawn',
    camera: 'Medium shot, following behind',
    beatReference: 'Beat 2: The Discovery'
  },
];

interface Stage7ShotListProps {
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage7ShotList({ sceneId, onComplete, onBack }: Stage7ShotListProps) {
  const [shots, setShots] = useState<Shot[]>(mockShots);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(mockShots[0]);
  const [editingField, setEditingField] = useState<string | null>(null);

  const handleShotUpdate = (shotId: string, field: keyof Shot, value: string | number | string[]) => {
    setShots(prev => prev.map(shot => 
      shot.id === shotId ? { ...shot, [field]: value } : shot
    ));
    if (selectedShot?.id === shotId) {
      setSelectedShot(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleAddShot = () => {
    const lastShot = shots[shots.length - 1];
    const newShotNumber = shots.length + 1;
    const newShot: Shot = {
      id: `shot-${newShotNumber}`,
      sceneId,
      shotId: `${Math.ceil(newShotNumber / 3)}${String.fromCharCode(65 + ((newShotNumber - 1) % 3))}`,
      duration: 8,
      dialogue: '',
      action: '',
      charactersForeground: [],
      charactersBackground: [],
      setting: lastShot?.setting || '',
      camera: '',
    };
    setShots([...shots, newShot]);
    setSelectedShot(newShot);
  };

  const handleDeleteShot = (shotId: string) => {
    setShots(prev => prev.filter(s => s.id !== shotId));
    if (selectedShot?.id === shotId) {
      setSelectedShot(shots.find(s => s.id !== shotId) || null);
    }
  };

  const handleSplitShot = (shotId: string) => {
    const shotIndex = shots.findIndex(s => s.id === shotId);
    if (shotIndex === -1) return;
    
    const shot = shots[shotIndex];
    const newShot: Shot = {
      ...shot,
      id: `shot-${Date.now()}`,
      shotId: `${shot.shotId}-split`,
      action: 'Split from: ' + shot.action.substring(0, 50) + '...',
    };
    
    const newShots = [...shots];
    newShots.splice(shotIndex + 1, 0, newShot);
    setShots(newShots);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Rearview Mirror */}
      <RearviewMirror
        mode="text"
        priorSceneEndState="Maya walks toward the station exit, her silhouette framed against the dawn light. The empty platform stretches behind her."
        priorSceneName="Scene 0: Prologue"
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Shot Table - Left Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-96 border-r border-border/50 bg-card/30 backdrop-blur-sm flex flex-col"
        >
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Shot List</h2>
              <p className="text-xs text-muted-foreground">
                {shots.length} shots • {shots.length * 8}s total
              </p>
            </div>
            <Button variant="gold" size="sm" onClick={handleAddShot}>
              <Plus className="w-4 h-4 mr-1" />
              Add Shot
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {shots.map((shot, index) => (
                <motion.button
                  key={shot.id}
                  onClick={() => setSelectedShot(shot)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'w-full p-3 rounded-lg mb-2 text-left transition-all',
                    selectedShot?.id === shot.id 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'bg-card/50 border border-border/30 hover:border-border'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {shot.shotId}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {shot.duration}s
                      </span>
                    </div>
                    <ChevronRight className={cn(
                      'w-4 h-4',
                      selectedShot?.id === shot.id ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  
                  <p className="text-sm text-foreground line-clamp-2">
                    {shot.action || 'No action defined'}
                  </p>
                  
                  {shot.dialogue && (
                    <p className="text-xs text-primary/80 mt-1 italic line-clamp-1">
                      {shot.dialogue}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    {shot.charactersForeground.length > 0 && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {shot.charactersForeground.join(', ')}
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </motion.div>

        {/* Shot Inspector - Main Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {selectedShot ? (
            <>
              {/* Inspector Header */}
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                    {selectedShot.shotId}
                  </Badge>
                  <div>
                    <p className="text-sm text-foreground font-medium">Shot Inspector</p>
                    {selectedShot.beatReference && (
                      <p className="text-xs text-muted-foreground">{selectedShot.beatReference}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleSplitShot(selectedShot.id)}
                  >
                    <Split className="w-4 h-4 mr-1" />
                    Split
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteShot(selectedShot.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* Duration */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Duration (seconds)
                    </label>
                    <Input
                      type="number"
                      value={selectedShot.duration}
                      onChange={(e) => handleShotUpdate(selectedShot.id, 'duration', parseInt(e.target.value) || 8)}
                      min={1}
                      max={16}
                      className="w-32"
                    />
                  </div>

                  {/* Action */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Action
                    </label>
                    <Textarea
                      value={selectedShot.action}
                      onChange={(e) => handleShotUpdate(selectedShot.id, 'action', e.target.value)}
                      placeholder="Describe the atomic physical action for this shot..."
                      rows={4}
                    />
                  </div>

                  {/* Dialogue */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Dialogue (Verbatim)
                    </label>
                    <Textarea
                      value={selectedShot.dialogue}
                      onChange={(e) => handleShotUpdate(selectedShot.id, 'dialogue', e.target.value)}
                      placeholder="CHARACTER: Dialogue here..."
                      rows={2}
                    />
                  </div>

                  {/* Characters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        Foreground Characters
                      </label>
                      <Input
                        value={selectedShot.charactersForeground.join(', ')}
                        onChange={(e) => handleShotUpdate(selectedShot.id, 'charactersForeground', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="Maya, The Stranger"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        Background Characters
                      </label>
                      <Input
                        value={selectedShot.charactersBackground.join(', ')}
                        onChange={(e) => handleShotUpdate(selectedShot.id, 'charactersBackground', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="Crowd extras, etc."
                      />
                    </div>
                  </div>

                  {/* Setting */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Setting
                    </label>
                    <Input
                      value={selectedShot.setting}
                      onChange={(e) => handleShotUpdate(selectedShot.id, 'setting', e.target.value)}
                      placeholder="Train Platform - Dawn"
                    />
                  </div>

                  {/* Camera */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4 text-primary" />
                      Camera
                    </label>
                    <Input
                      value={selectedShot.camera}
                      onChange={(e) => handleShotUpdate(selectedShot.id, 'camera', e.target.value)}
                      placeholder="Wide shot, tracking left to right"
                    />
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Select a shot to inspect</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card/30">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Script Hub
        </Button>
        <Button variant="gold" onClick={onComplete}>
          <Check className="w-4 h-4 mr-2" />
          Lock Shot List & Proceed
        </Button>
      </div>
    </div>
  );
}
