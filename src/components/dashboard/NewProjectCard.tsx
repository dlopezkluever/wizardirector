import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface NewProjectCardProps {
  onClick: () => void;
}

export function NewProjectCard({ onClick }: NewProjectCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center min-h-[280px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-card/50 hover:bg-card transition-all duration-300 cursor-pointer"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Plus className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-display text-xl font-semibold text-foreground mb-1">
            New Project
          </h3>
          <p className="text-sm text-muted-foreground">
            Start a new narrative pipeline
          </p>
        </div>
      </div>
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent" />
      </div>
    </motion.button>
  );
}
