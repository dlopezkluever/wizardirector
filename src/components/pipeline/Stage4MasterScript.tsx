import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, RefreshCw, Edit3, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const mockScript = `FADE IN:

INT. JAMES CALLAHAN'S HOME - DAY

A modest suburban living room. Faded photographs line the walls - handshakes with presidents, the iconic Mars mission shot. Dust particles float in slanted afternoon light.

JAMES CALLAHAN (65), gaunt but dignified, sits in a worn leather chair. His hands tremble slightly as he holds a medical report.

JAMES (V.O.)
Six months. Maybe less. That's what they gave me.

He sets the paper down. His gaze drifts to a photograph of a young woman - ELENA, his daughter.

JAMES (V.O.) (CONT'D)
Funny how distance works. Three hundred million miles to Mars felt closer than the twenty blocks to her apartment.

James stands, joints protesting. He moves to a desk drawer, retrieves an unopened envelope. The handwriting is feminine, the postmark five years old.

INSERT - ENVELOPE
"Dad" written in Elena's handwriting. Return address: Seattle, WA.

BACK TO SCENE

James's fingers hover over the seal. He takes a breath.

JAMES
(to himself)
I'm sorry, Maria. I should have opened this years ago.

He tears it open.

CUT TO:

INT. ELENA'S ARCHITECTURE FIRM - DAY

Modern glass and steel. ELENA CALLAHAN (38), polished and precise, reviews blueprints. Her phone buzzes. She ignores it.

MARCUS (16), her son, appears in the doorway. Lanky, headphones around his neck.

MARCUS
Mom. Dad called again.

ELENA
(not looking up)
Tell him I'm in a meeting.

MARCUS
You're always in a meeting.

Elena finally looks up. Something flickers in her eyes - recognition of her father's patterns in her own behavior.

ELENA
Marcus, I...

But he's already gone.`;

interface Stage4MasterScriptProps {
  onComplete: () => void;
  onBack: () => void;
}

export function Stage4MasterScript({ onComplete, onBack }: Stage4MasterScriptProps) {
  const [content, setContent] = useState(mockScript);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleApprove = useCallback(() => {
    toast.success('Master Script approved and locked');
    onComplete();
  }, [onComplete]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Master Script</h2>
            <p className="text-sm text-muted-foreground">Finalized narrative blueprint</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />Regenerate
          </Button>
          <Button variant="gold" size="sm" onClick={handleApprove} className="gap-2">
            <Lock className="w-4 h-4" />Approve Script
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Button variant={isEditing ? 'stage-active' : 'ghost'} size="sm" onClick={() => setIsEditing(!isEditing)} className="gap-2">
              <Edit3 className="w-4 h-4" />{isEditing ? 'Editing' : 'Edit Mode'}
            </Button>
          </div>
          
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setHasChanges(true); }}
              className="w-full min-h-[700px] p-6 rounded-xl bg-card border border-border text-foreground font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ) : (
            <pre className="p-6 rounded-xl bg-card border border-border text-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
