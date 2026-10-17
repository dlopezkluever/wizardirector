import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircleQuestion, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface AskAuteurQuestion {
  id: string;
  category: 'contradiction' | 'vague_trait' | 'ambiguous_structure' | 'missing_info';
  questionText: string;
  options: Array<{ id: string; label: string }>;
  subjectEntityType?: string;
  subjectEntityName?: string;
  conflictingSources?: string[];
}

export interface AskAuteurAnswer {
  questionId: string;
  selectedAnswer: string;
  answerSource: 'option' | 'freetext';
}

interface AskAuteurQuestionUIProps {
  questions: AskAuteurQuestion[];
  onSubmit: (answers: AskAuteurAnswer[]) => void;
  onDecline: () => void;
  isSubmitting?: boolean;
}

const CUSTOM_OPTION_ID = '__custom__';

/**
 * The clarification layer (spec Task 4.3) — modeled on this tool's own
 * AskUserQuestion UX: multiple-choice as the primary interface, a "type your
 * own answer" escape hatch per question, never an open text box on its own.
 * Every open question must be resolved (picked or typed) before submitting;
 * declining moves every question to answer_source 'ai_inferred' instead.
 */
export function AskAuteurQuestionUI({ questions, onSubmit, onDecline, isSubmitting }: AskAuteurQuestionUIProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [freetext, setFreetext] = useState<Record<string, string>>({});

  const selectOption = (questionId: string, optionId: string) => {
    setSelections(prev => ({ ...prev, [questionId]: optionId }));
  };

  const isAnswered = (q: AskAuteurQuestion) => {
    const sel = selections[q.id];
    if (!sel) return false;
    if (sel === CUSTOM_OPTION_ID) return (freetext[q.id] ?? '').trim().length > 0;
    return true;
  };

  const allAnswered = questions.every(isAnswered);

  const handleSubmit = () => {
    const answers: AskAuteurAnswer[] = questions.map(q => {
      const sel = selections[q.id];
      if (sel === CUSTOM_OPTION_ID) {
        return { questionId: q.id, selectedAnswer: freetext[q.id].trim(), answerSource: 'freetext' as const };
      }
      const option = q.options.find(o => o.id === sel);
      return { questionId: q.id, selectedAnswer: option?.label ?? '', answerSource: 'option' as const };
    });
    onSubmit(answers);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-start gap-2">
        <MessageCircleQuestion className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">A few things to confirm</h3>
          <p className="text-sm text-muted-foreground">Your material had some gaps or contradictions Streamline wants to check with you before generating anything.</p>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, index) => (
          <div key={q.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">{index + 1}. {q.questionText}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map(opt => (
                <Button
                  key={opt.id}
                  size="sm"
                  variant={selections[q.id] === opt.id ? 'stage-active' : 'stage'}
                  onClick={() => selectOption(q.id, opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
              <Button
                size="sm"
                variant={selections[q.id] === CUSTOM_OPTION_ID ? 'stage-active' : 'stage'}
                onClick={() => selectOption(q.id, CUSTOM_OPTION_ID)}
              >
                Type my own answer
              </Button>
            </div>
            {selections[q.id] === CUSTOM_OPTION_ID && (
              <input
                autoFocus
                value={freetext[q.id] ?? ''}
                onChange={(e) => setFreetext(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Your answer..."
                className="w-full text-sm bg-secondary border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>
        ))}
      </div>

      <div className={cn('flex items-center justify-between pt-2')}>
        <Button variant="ghost" size="sm" onClick={onDecline} disabled={isSubmitting} className="gap-1.5 text-muted-foreground">
          <X className="w-3.5 h-3.5" />
          Skip these questions
        </Button>
        <Button variant="gold" disabled={!allAnswered || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSubmitting ? 'Applying answers...' : `Submit ${questions.length} answer${questions.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </motion.div>
  );
}
