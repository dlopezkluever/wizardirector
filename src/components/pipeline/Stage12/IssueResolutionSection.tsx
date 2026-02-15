import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Image as ImageIcon,
  Clock,
  MessageSquare,
  ListOrdered,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IssueType } from '@/types/scene';
import type { IssueResolutionSectionProps } from './types';

const issueTypes: {
  type: IssueType;
  label: string;
  icon: typeof AlertTriangle;
  returnStage: number;
  description: string;
}[] = [
  { type: 'visual-continuity', label: 'Visual Continuity', icon: ImageIcon, returnStage: 8, description: 'Character appearance, set dressing, or visual style issues' },
  { type: 'timing', label: 'Timing Issue', icon: Clock, returnStage: 7, description: 'Shot duration, pacing, or rhythm problems' },
  { type: 'dialogue-audio', label: 'Dialogue/Audio', icon: MessageSquare, returnStage: 9, description: 'Dialogue timing, audio sync, or voice issues' },
  { type: 'narrative-structure', label: 'Narrative Structure', icon: ListOrdered, returnStage: 7, description: 'Story flow, scene ordering, or dramatic beat issues' },
];

export function IssueResolutionSection({ onReturnToStage }: IssueResolutionSectionProps) {
  const [selectedIssue, setSelectedIssue] = useState<IssueType | null>(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [showIssueConfirm, setShowIssueConfirm] = useState(false);

  const handleIssueSelect = (type: IssueType) => {
    setSelectedIssue(type);
    setShowIssueConfirm(true);
  };

  const handleIssueConfirm = () => {
    const issue = issueTypes.find(i => i.type === selectedIssue);
    if (issue) {
      setShowIssueConfirm(false);
      setSelectedIssue(null);
      setIssueDescription('');
      onReturnToStage(issue.returnStage);
    }
  };

  return (
    <>
      <div className="p-4 border-t border-border/50">
        <h3 className="font-display text-sm font-semibold text-foreground">
          Issue Resolution
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Found an issue? Select the type to return to the appropriate stage.
        </p>
      </div>

      <div className="p-4 space-y-2 border-t border-border/50">
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
                'w-5 h-5 flex-shrink-0',
                selectedIssue === type ? 'text-destructive' : 'text-muted-foreground'
              )} />
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <p className="text-xs text-muted-foreground">
                  Return to Stage {returnStage}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Issue Confirmation Dialog */}
      <AnimatePresence>
        {showIssueConfirm && selectedIssue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowIssueConfirm(false)}
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
                    setShowIssueConfirm(false);
                    setSelectedIssue(null);
                    setIssueDescription('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="gold"
                  className="flex-1"
                  onClick={handleIssueConfirm}
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
