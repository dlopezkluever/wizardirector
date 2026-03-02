import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Image as ImageIcon,
  Clock,
  MessageSquare,
  ListOrdered,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { IssueType } from '@/types/scene';
import type { IssueResolutionSectionProps } from './types';

const issueTypes: {
  type: IssueType;
  label: string;
  icon: typeof AlertTriangle;
  returnStage: number;
}[] = [
  { type: 'visual-continuity', label: 'Visual Continuity', icon: ImageIcon, returnStage: 8 },
  { type: 'timing', label: 'Timing Issue', icon: Clock, returnStage: 7 },
  { type: 'dialogue-audio', label: 'Dialogue/Audio', icon: MessageSquare, returnStage: 9 },
  { type: 'narrative-structure', label: 'Narrative Structure', icon: ListOrdered, returnStage: 7 },
];

export function UnsatisfiedDropdown({ onReturnToStage }: IssueResolutionSectionProps) {
  const [selectedIssue, setSelectedIssue] = useState<IssueType | null>(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleIssueSelect = (type: IssueType) => {
    setSelectedIssue(type);
    setPopoverOpen(false);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    const issue = issueTypes.find(i => i.type === selectedIssue);
    if (issue) {
      setShowConfirm(false);
      setSelectedIssue(null);
      setIssueDescription('');
      onReturnToStage(issue.returnStage);
    }
  };

  return (
    <>
      <div className="px-4 pb-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span>Unsatisfied with results?</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" sideOffset={8} className="w-56 p-1">
            {issueTypes.map(({ type, label, icon: Icon, returnStage }) => (
              <button
                key={type}
                onClick={() => handleIssueSelect(type)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                <span className="text-[10px] text-muted-foreground/60">&rarr; Stage {returnStage}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && selectedIssue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowConfirm(false)}
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
                    Return to Stage {issueTypes.find(i => i.type === selectedIssue)?.returnStage}?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {issueTypes.find(i => i.type === selectedIssue)?.label}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                This will return you to an earlier stage to resolve the issue.
                Your current video jobs will be preserved.
              </p>

              <div className="mb-4">
                <label className="text-sm font-medium text-foreground block mb-1">
                  Describe the issue (optional)
                </label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="What specifically needs to be fixed..."
                  className="w-full h-20 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowConfirm(false);
                    setSelectedIssue(null);
                    setIssueDescription('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="gold"
                  className="flex-1"
                  onClick={handleConfirm}
                >
                  Return to Stage {issueTypes.find(i => i.type === selectedIssue)?.returnStage}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
