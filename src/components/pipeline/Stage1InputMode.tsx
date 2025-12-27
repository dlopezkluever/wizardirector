import { motion } from 'framer-motion';
import { 
  FileText, 
  Wand2, 
  Layers, 
  ScrollText, 
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InputMode, ProjectType, ContentRating } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

interface InputModeOption {
  id: InputMode;
  title: string;
  description: string;
  icon: React.ElementType;
}

const inputModes: InputModeOption[] = [
  {
    id: 'expansion',
    title: 'Expansion',
    description: 'Start with a brief idea and expand into a full narrative',
    icon: Wand2,
  },
  {
    id: 'condensation',
    title: 'Condensation',
    description: 'Condense a large text into a cinematic narrative',
    icon: Layers,
  },
  {
    id: 'transformation',
    title: 'Transformation',
    description: 'Transform existing content with a creative twist',
    icon: ScrollText,
  },
  {
    id: 'script-skip',
    title: 'Script Skip',
    description: 'Upload a formatted screenplay directly',
    icon: FileText,
  },
];

const projectTypes: { id: ProjectType; label: string; description: string }[] = [
  { id: 'narrative', label: 'Narrative Short Film', description: 'Traditional storytelling structure' },
  { id: 'commercial', label: 'Commercial / Trailer', description: 'High-impact promotional content' },
  { id: 'audio-visual', label: 'Video for Audio', description: 'Visual accompaniment for podcasts, audiobooks' },
];

const contentRatings: { id: ContentRating; label: string }[] = [
  { id: 'G', label: 'G - General Audiences' },
  { id: 'PG', label: 'PG - Parental Guidance' },
  { id: 'PG-13', label: 'PG-13 - Parents Strongly Cautioned' },
  { id: 'M', label: 'M - Mature Audiences' },
];

const genres = [
  'Drama', 'Comedy', 'Thriller', 'Romance', 'Sci-Fi', 
  'Horror', 'Action', 'Documentary', 'Fantasy', 'Mystery'
];

interface Stage1InputModeProps {
  onComplete: () => void;
}

export function Stage1InputMode({ onComplete }: Stage1InputModeProps) {
  const [selectedMode, setSelectedMode] = useState<InputMode | null>(null);
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | null>(null);
  const [selectedRating, setSelectedRating] = useState<ContentRating>('PG-13');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [targetLength, setTargetLength] = useState<[number, number]>([3, 5]);
  const [tonalPrecision, setTonalPrecision] = useState('');

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const canProceed = selectedMode && selectedProjectType && tonalPrecision.length >= 10;

  return (
    <div className="flex-1 overflow-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-10"
      >
        {/* Header */}
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">
            Initialize Your Narrative
          </h2>
          <p className="text-muted-foreground">
            Configure the global parameters that will define your film's foundation
          </p>
        </div>

        {/* Input Mode Selection */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Select Input Mode
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inputModes.map((mode, index) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;

              return (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    'relative flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-gold'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-card/80'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-xl transition-colors',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">
                      {mode.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {mode.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Project Type */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Project Type
          </h3>
          <div className="flex flex-wrap gap-3">
            {projectTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedProjectType === type.id ? 'stage-active' : 'stage'}
                onClick={() => setSelectedProjectType(type.id)}
                className="h-auto py-3 px-4 flex-col items-start gap-1"
              >
                <span className="font-medium">{type.label}</span>
                <span className="text-xs opacity-70">{type.description}</span>
              </Button>
            ))}
          </div>
        </section>

        {/* Target Length */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Target Length
            </h3>
            <span className="text-primary font-medium">
              {targetLength[0]}:00 - {targetLength[1]}:00 min
            </span>
          </div>
          <Slider
            value={targetLength}
            onValueChange={(value) => setTargetLength(value as [number, number])}
            min={1}
            max={15}
            step={1}
            className="py-4"
          />
        </section>

        {/* Content Rating */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Content Rating
          </h3>
          <div className="flex flex-wrap gap-2">
            {contentRatings.map((rating) => (
              <Button
                key={rating.id}
                variant={selectedRating === rating.id ? 'stage-active' : 'stage'}
                size="sm"
                onClick={() => setSelectedRating(rating.id)}
              >
                {rating.label}
              </Button>
            ))}
          </div>
        </section>

        {/* Genre Selection */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Genre / Tone
          </h3>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Button
                key={genre}
                variant={selectedGenres.includes(genre) ? 'stage-active' : 'stage'}
                size="sm"
                onClick={() => toggleGenre(genre)}
              >
                {genre}
              </Button>
            ))}
          </div>
        </section>

        {/* Tonal Precision */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Tonal Precision
            </h3>
            <span className="text-xs text-muted-foreground">
              {tonalPrecision.length}/10 characters minimum
            </span>
          </div>
          <textarea
            value={tonalPrecision}
            onChange={(e) => setTonalPrecision(e.target.value)}
            placeholder="Describe the specific tone and atmosphere you want (e.g., 'Dark and moody with moments of dry humor, reminiscent of early Coen Brothers films...')"
            className="w-full h-32 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </section>

        {/* Proceed Button */}
        <div className="flex justify-end pt-6 border-t border-border">
          <Button
            variant="gold"
            size="lg"
            disabled={!canProceed}
            onClick={onComplete}
            className="min-w-[200px]"
          >
            Continue to Treatment
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
