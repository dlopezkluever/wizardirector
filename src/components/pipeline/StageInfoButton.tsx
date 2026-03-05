import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { stageInfoContent } from '@/config/stageInfoContent';

interface StageInfoButtonProps {
  infoKey: string;
}

export function StageInfoButton({ infoKey }: StageInfoButtonProps) {
  const [visible, setVisible] = useState(false);
  const info = stageInfoContent[infoKey];

  // Gentle entrance delay
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  if (!info) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 z-30"
        >
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/60 border border-border/40 text-muted-foreground/60 hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition-all duration-200"
                aria-label="Stage info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              sideOffset={8}
              className="w-72 p-0"
            >
              <div className="px-3 py-2 border-b border-border/50">
                <h4 className="text-xs font-semibold text-foreground">{info.title}</h4>
              </div>
              <ul className="px-3 py-2 space-y-1.5">
                {info.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-primary/60 mt-0.5 flex-shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
