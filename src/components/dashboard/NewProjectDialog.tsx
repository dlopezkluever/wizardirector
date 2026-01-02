import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2 } from 'lucide-react';
import { projectService } from '@/lib/services/projectService';
import { useToast } from '@/hooks/use-toast';
import type { ProjectSettings, ProjectType, ContentRating } from '@/types/project';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (projectId: string) => void;
}

const GENRE_OPTIONS = [
  'Drama', 'Comedy', 'Thriller', 'Romance', 'Sci-Fi', 'Fantasy',
  'Horror', 'Action', 'Mystery', 'Adventure', 'Documentary', 'Animation'
];

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'narrative', label: 'Narrative Short Film' },
  { value: 'commercial', label: 'Commercial/Trailer' },
  { value: 'audio_visual', label: 'Video Content for Audio' }
];

const CONTENT_RATING_OPTIONS: { value: ContentRating; label: string }[] = [
  { value: 'G', label: 'G - General Audience' },
  { value: 'PG', label: 'PG - Parental Guidance' },
  { value: 'PG-13', label: 'PG-13 - Parents Cautioned' },
  { value: 'M', label: 'M - Mature' }
];

export function NewProjectDialog({ open, onOpenChange, onProjectCreated }: NewProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProjectSettings>({
    projectTitle: '',
    inputMode: 'expansion',
    projectType: 'narrative',
    contentRating: 'PG',
    genres: [],
    tonalPrecision: '',
    targetLength: { min: 180, max: 300 }
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectTitle?.trim()) {
      toast({
        title: 'Error',
        description: 'Project title is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const project = await projectService.createProject(formData);
      toast({
        title: 'Success',
        description: `Project "${project.title}" created successfully`,
      });
      onProjectCreated(project.id);
      onOpenChange(false);
      // Reset form
      setFormData({
        projectTitle: '',
        inputMode: 'expansion',
        projectType: 'narrative',
        contentRating: 'PG',
        genres: [],
        tonalPrecision: '',
        targetLength: { min: 180, max: 300 }
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addGenre = (genre: string) => {
    if (!formData.genres.includes(genre)) {
      setFormData(prev => ({
        ...prev,
        genres: [...prev.genres, genre]
      }));
    }
  };

  const removeGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.filter(g => g !== genre)
    }));
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Create New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Project Title *
            </Label>
            <Input
              id="title"
              value={formData.projectTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, projectTitle: e.target.value }))}
              placeholder="Enter your project title..."
              required
            />
          </div>

          {/* Project Type & Content Rating */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Project Type</Label>
              <Select
                value={formData.projectType}
                onValueChange={(value: ProjectType) =>
                  setFormData(prev => ({ ...prev, projectType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Content Rating</Label>
              <Select
                value={formData.contentRating}
                onValueChange={(value: ContentRating) =>
                  setFormData(prev => ({ ...prev, contentRating: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_RATING_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Length */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Target Length: {formatDuration(formData.targetLength.min)} - {formatDuration(formData.targetLength.max)}
            </Label>
            <div className="px-3">
              <Slider
                value={[formData.targetLength.min, formData.targetLength.max]}
                onValueChange={([min, max]) =>
                  setFormData(prev => ({
                    ...prev,
                    targetLength: { min, max }
                  }))
                }
                min={60}
                max={600}
                step={30}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Set the desired duration range for your final video (1-10 minutes)
            </p>
          </div>

          {/* Genres */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Genres</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.genres.map(genre => (
                <Badge key={genre} variant="secondary" className="flex items-center gap-1">
                  {genre}
                  <button
                    type="button"
                    onClick={() => removeGenre(genre)}
                    className="hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Select onValueChange={addGenre}>
              <SelectTrigger>
                <SelectValue placeholder="Add a genre..." />
              </SelectTrigger>
              <SelectContent>
                {GENRE_OPTIONS.filter(genre => !formData.genres.includes(genre)).map(genre => (
                  <SelectItem key={genre} value={genre}>
                    <div className="flex items-center gap-2">
                      <Plus className="w-3 h-3" />
                      {genre}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tonal Precision */}
          <div className="space-y-2">
            <Label htmlFor="tonal" className="text-sm font-medium">
              Tonal Precision
            </Label>
            <Textarea
              id="tonal"
              value={formData.tonalPrecision}
              onChange={(e) => setFormData(prev => ({ ...prev, tonalPrecision: e.target.value }))}
              placeholder="Describe the specific tone, style, or creative direction you want to achieve..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Provide detailed guidance for the AI to understand your creative vision (minimum 10 characters when creating)
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
