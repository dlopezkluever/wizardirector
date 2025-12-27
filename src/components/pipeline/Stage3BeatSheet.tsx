import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  GripVertical,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  RefreshCw,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Beat {
  id: string;
  number: number;
  content: string;
  originalTreatmentExcerpt?: string;
  isExpanded: boolean;
}

// Mock beat data
const mockBeats: Beat[] = [
  { id: '1', number: 1, content: 'James Callahan, retired astronaut, receives terminal diagnosis. Six months to live.', isExpanded: false },
  { id: '2', number: 2, content: 'James finds an unopened letter from his estranged daughter Elena, dated five years ago.', isExpanded: false },
  { id: '3', number: 3, content: 'Flashback: The day Elena cut ties - her mother\'s funeral, James arriving late from a mission debrief.', isExpanded: false },
  { id: '4', number: 4, content: 'James decides to find Elena. Packs a single bag, leaves his medals behind.', isExpanded: false },
  { id: '5', number: 5, content: 'Cross-country journey begins. Each mile triggers memories of missed moments.', isExpanded: false },
  { id: '6', number: 6, content: 'Elena in Seattle, successful but hollow. Her marriage is failing. Her son Marcus is distant.', isExpanded: false },
  { id: '7', number: 7, content: 'James arrives at Elena\'s home. She sees him through the window but doesn\'t answer the door.', isExpanded: false },
  { id: '8', number: 8, content: 'Marcus, curious about the stranger, sneaks out to meet his grandfather.', isExpanded: false },
  { id: '9', number: 9, content: 'Marcus and James connect over astronomy. James sees his own patterns repeating.', isExpanded: false },
  { id: '10', number: 10, content: 'Elena confronts her father. Years of anger pour out. James doesn\'t defend himself.', isExpanded: false },
  { id: '11', number: 11, content: 'James reveals the truth: Maria asked him to stay away. She was protecting Elena from his radiation sickness.', isExpanded: false },
  { id: '12', number: 12, content: 'Elena\'s walls crack. She reads her mother\'s hidden letters, finally understanding.', isExpanded: false },
  { id: '13', number: 13, content: 'Father and daughter watch the sunset together. They don\'t speak. They don\'t need to.', isExpanded: false },
  { id: '14', number: 14, content: 'Time jump: Three months later. James in hospice, but not alone. Elena and Marcus at his bedside.', isExpanded: false },
  { id: '15', number: 15, content: 'Final scene: Marcus on a rooftop, telescope pointed at Mars. He whispers "Goodnight, grandpa."', isExpanded: false },
];

interface Stage3BeatSheetProps {
  onComplete: () => void;
  onBack: () => void;
}

export function Stage3BeatSheet({ onComplete, onBack }: Stage3BeatSheetProps) {
  const [beats, setBeats] = useState<Beat[]>(mockBeats);
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateGuidance, setRegenerateGuidance] = useState('');
  const [selectedBeatForBrainstorm, setSelectedBeatForBrainstorm] = useState<string | null>(null);
  const [isOutdated, setIsOutdated] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleReorder = useCallback((newOrder: Beat[]) => {
    const reorderedBeats = newOrder.map((beat, index) => ({
      ...beat,
      number: index + 1,
    }));
    setBeats(reorderedBeats);
    setHasChanges(true);
  }, []);

  const handleBeatContentChange = useCallback((beatId: string, newContent: string) => {
    setBeats(prev => prev.map(beat => 
      beat.id === beatId ? { ...beat, content: newContent } : beat
    ));
    setHasChanges(true);
  }, []);

  const toggleBeatExpand = useCallback((beatId: string) => {
    setBeats(prev => prev.map(beat => 
      beat.id === beatId ? { ...beat, isExpanded: !beat.isExpanded } : beat
    ));
  }, []);

  const addBeatAfter = useCallback((afterBeatId: string) => {
    const index = beats.findIndex(b => b.id === afterBeatId);
    const newBeat: Beat = {
      id: `beat-${Date.now()}`,
      number: index + 2,
      content: 'New beat - describe what happens here...',
      isExpanded: false,
    };
    
    const newBeats = [
      ...beats.slice(0, index + 1),
      newBeat,
      ...beats.slice(index + 1).map(b => ({ ...b, number: b.number + 1 })),
    ];
    setBeats(newBeats);
    setEditingBeatId(newBeat.id);
    setHasChanges(true);
    toast.success('New beat added');
  }, [beats]);

  const deleteBeat = useCallback((beatId: string) => {
    if (beats.length <= 3) {
      toast.error('Minimum 3 beats required');
      return;
    }
    const index = beats.findIndex(b => b.id === beatId);
    const newBeats = beats
      .filter(b => b.id !== beatId)
      .map((b, i) => ({ ...b, number: i + 1 }));
    setBeats(newBeats);
    setHasChanges(true);
    toast.success('Beat removed');
  }, [beats]);

  const handleBrainstorm = useCallback((beatId: string) => {
    setSelectedBeatForBrainstorm(beatId);
    toast.info('Brainstorming alternatives...', {
      description: 'AI is generating 3 alternative versions of this beat'
    });
    // Mock: In real app, this would call the LLM
    setTimeout(() => {
      setSelectedBeatForBrainstorm(null);
      toast.success('3 alternatives generated', {
        description: 'Select one to replace the current beat'
      });
    }, 2000);
  }, []);

  const handleConfirmAndLock = useCallback(() => {
    if (beats.some(b => b.content.length < 10)) {
      toast.error('All beats must have at least 10 characters');
      return;
    }
    onComplete();
  }, [beats, onComplete]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            ← Back
          </Button>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Beat Sheet
            </h2>
            <p className="text-sm text-muted-foreground">
              Structural anchor for your narrative • {beats.length} beats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOutdated && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-warning border-warning/50"
            >
              <AlertTriangle className="w-4 h-4" />
              Sync with Script
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegenerateDialog(true)}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate All
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={handleConfirmAndLock}
            className="gap-2"
          >
            <Lock className="w-4 h-4" />
            Confirm & Lock
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-6 py-3 border-b border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Drag to reorder</span> • 
          Click to edit • 
          <Sparkles className="w-3 h-3 inline mx-1" /> to brainstorm alternatives
        </p>
      </div>

      {/* Beat List */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Reorder.Group
            axis="y"
            values={beats}
            onReorder={handleReorder}
            className="space-y-3"
          >
            {beats.map((beat) => (
              <Reorder.Item
                key={beat.id}
                value={beat}
                className="list-none"
              >
                <motion.div
                  layout
                  className={cn(
                    'group relative rounded-xl border transition-all duration-200',
                    editingBeatId === beat.id
                      ? 'bg-primary/10 border-primary shadow-gold'
                      : 'bg-card border-border hover:border-primary/30'
                  )}
                >
                  <div className="flex items-start gap-3 p-4">
                    {/* Drag Handle */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 mt-0.5">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Beat Number */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-semibold text-sm shrink-0">
                      {beat.number}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {editingBeatId === beat.id ? (
                        <textarea
                          value={beat.content}
                          onChange={(e) => handleBeatContentChange(beat.id, e.target.value)}
                          onBlur={() => setEditingBeatId(null)}
                          autoFocus
                          className="w-full min-h-[80px] p-2 rounded-lg bg-secondary border border-border text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <p 
                          onClick={() => setEditingBeatId(beat.id)}
                          className="text-foreground cursor-text hover:bg-secondary/50 p-2 -m-2 rounded-lg transition-colors"
                        >
                          {beat.content}
                        </p>
                      )}

                      {/* Treatment Excerpt (expandable) */}
                      {beat.originalTreatmentExcerpt && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleBeatExpand(beat.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {beat.isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            View original treatment context
                          </button>
                          <AnimatePresence>
                            {beat.isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground overflow-hidden"
                              >
                                {beat.originalTreatmentExcerpt}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleBrainstorm(beat.id)}
                        title="Brainstorm alternatives"
                      >
                        <Sparkles className={cn(
                          'w-4 h-4',
                          selectedBeatForBrainstorm === beat.id && 'animate-pulse text-primary'
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => addBeatAfter(beat.id)}
                        title="Add beat after"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteBeat(beat.id)}
                        title="Delete beat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {/* Add Beat at End */}
          <Button
            variant="outline"
            onClick={() => addBeatAfter(beats[beats.length - 1].id)}
            className="w-full mt-4 gap-2 border-dashed"
          >
            <Plus className="w-4 h-4" />
            Add Beat
          </Button>
        </div>
      </div>

      {/* Regeneration Dialog */}
      <AnimatePresence>
        {showRegenerateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowRegenerateDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-xl bg-card border border-border shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Regeneration Guidance
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Provide guidance for how you want the beat sheet to be regenerated.
              </p>
              <textarea
                value={regenerateGuidance}
                onChange={(e) => setRegenerateGuidance(e.target.value)}
                placeholder="e.g., 'Add more tension in the middle section. Include a twist at beat 10...'"
                className="w-full h-32 px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center justify-between mt-4">
                <span className={cn(
                  'text-xs',
                  regenerateGuidance.length >= 10 ? 'text-success' : 'text-muted-foreground'
                )}>
                  {regenerateGuidance.length}/10 minimum
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowRegenerateDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="gold"
                    disabled={regenerateGuidance.length < 10}
                    onClick={() => {
                      toast.success('Beat sheet regeneration queued');
                      setShowRegenerateDialog(false);
                    }}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
