import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SliderComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  leftImage: string;
  rightImage: string;
  leftLabel?: string;
  rightLabel?: string;
}

export function SliderComparison({
  isOpen,
  onClose,
  leftImage,
  rightImage,
  leftLabel = 'Previous End Frame',
  rightLabel = 'Current Start Frame',
}: SliderComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    [isDragging]
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleMouseMove, handleMouseUp, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl mx-4"
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Labels */}
            <div className="flex justify-between mb-3 text-sm">
              <span className="text-white/70 flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                {leftLabel}
              </span>
              <span className="text-white/70 flex items-center gap-2">
                {rightLabel}
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>

            {/* Comparison container */}
            <div
              ref={containerRef}
              className="relative aspect-video rounded-lg overflow-hidden cursor-col-resize select-none"
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              {/* Right image (full, underneath) */}
              <img
                src={rightImage}
                alt={rightLabel}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />

              {/* Left image (clipped) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={leftImage}
                  alt={leftLabel}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>

              {/* Slider line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
              >
                {/* Slider handle */}
                <div
                  className={cn(
                    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                    'w-10 h-10 rounded-full bg-white shadow-lg',
                    'flex items-center justify-center',
                    'transition-transform',
                    isDragging && 'scale-110'
                  )}
                >
                  <div className="flex items-center gap-0.5">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <p className="text-center text-white/50 text-sm mt-3">
              Drag the slider or use arrow keys to compare frames
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
