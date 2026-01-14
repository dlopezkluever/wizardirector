import { useState, useEffect } from 'react';
import { X, Plus, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import { styleCapsuleService } from '@/lib/services/styleCapsuleService';
import type {
  VisualStyleCapsuleFormData,
  VisualStyleCapsuleCreate,
  DesignPillars
} from '@/types/styleCapsule';
import { validateVisualStyleCapsule, DEFAULT_VISUAL_CAPSULE_FORM } from '@/types/styleCapsule';
import { ImageUploader } from './ImageUploader';

interface VisualStyleCapsuleEditorProps {
  capsule?: any; // For editing existing capsules
  onSave: () => void;
  onCancel: () => void;
  readOnly?: boolean;
}

const DESIGN_PILLAR_OPTIONS = {
  colorPalette: [
    'Monochrome',
    'Pastels',
    'Neons',
    'Earth tones',
    'High contrast',
    'Muted colors',
    'Vibrant primary colors',
    'Cool blues and greens',
    'Warm reds and oranges',
    'Black and white'
  ],
  mood: [
    'Melancholic',
    'Energetic',
    'Ominous',
    'Whimsical',
    'Serene',
    'Intense',
    'Nostalgic',
    'Dystopian',
    'Hopeful',
    'Foreboding'
  ],
  medium: [
    'Photorealistic',
    'Oil painting',
    'Watercolor',
    'Digital art',
    'Film grain',
    'Anime',
    'Cartoon',
    'Sketch',
    '3D render',
    'Mixed media'
  ],
  lighting: [
    'Natural daylight',
    'Golden hour',
    'Harsh shadows',
    'Soft diffused',
    'Neon glow',
    'Candlelight',
    'Overcast',
    'High contrast',
    'Rim lighting',
    'Ambient only'
  ],
  cameraLanguage: [
    'Static wide shots',
    'Dynamic handheld',
    'Dutch angles',
    'Extreme close-ups',
    'Long lens compression',
    'Wide angle distortion',
    'Tracking shots',
    'Quick cuts',
    'Slow zooms',
    'Locked down'
  ]
};

export function VisualStyleCapsuleEditor({
  capsule,
  onSave,
  onCancel,
  readOnly = false
}: VisualStyleCapsuleEditorProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<VisualStyleCapsuleFormData>(
    capsule ? {
      name: capsule.name || '',
      designPillars: capsule.designPillars || { ...DEFAULT_VISUAL_CAPSULE_FORM.designPillars },
      descriptorStrings: capsule.descriptorStrings || '',
      referenceImages: []
    } : DEFAULT_VISUAL_CAPSULE_FORM
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(capsule?.referenceImageUrls || []);

  const updateFormData = (updates: Partial<VisualStyleCapsuleFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateDesignPillar = (key: keyof DesignPillars, value: string) => {
    updateFormData({
      designPillars: {
        ...formData.designPillars,
        [key]: value
      }
    });
  };

  const handleImagesUploaded = (imageUrls: string[]) => {
    setExistingImages(prev => [...prev, ...imageUrls]);
  };

  const handleRemoveImage = async (imageUrl: string, index: number) => {
    try {
      // If this is an existing capsule, remove from database
      if (capsule?.id) {
        await styleCapsuleService.removeImage(capsule.id, index);
        setExistingImages(prev => prev.filter((_, i) => i !== index));
        toast({
          title: 'Success',
          description: 'Image removed successfully.',
        });
      } else {
        // For new capsules, just remove from local state
        setExistingImages(prev => prev.filter((_, i) => i !== index));
      }
    } catch (error) {
      console.error('Failed to remove image:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove image.',
        variant: 'destructive',
      });
    }
  };

  const validateForm = (): boolean => {
    const createData: Partial<VisualStyleCapsuleCreate> = {
      name: formData.name,
      designPillars: formData.designPillars,
      descriptorStrings: formData.descriptorStrings.trim() || undefined,
      referenceImageUrls: existingImages
    };

    const validationErrors = validateVisualStyleCapsule(createData);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const createData: VisualStyleCapsuleCreate = {
        name: formData.name,
        type: 'visual',
        designPillars: formData.designPillars,
        descriptorStrings: formData.descriptorStrings.trim() || undefined,
        referenceImageUrls: existingImages
      };

      await styleCapsuleService.createCapsule(createData);
      onSave();
    } catch (error) {
      console.error('Failed to create visual style capsule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create style capsule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDesignPillarSelect = (
    key: keyof DesignPillars,
    label: string,
    options: string[]
  ) => (
    <div className="space-y-2">
      <Label htmlFor={key as string}>{label}</Label>
      <Select
        value={formData.designPillars[key] || ''}
        onValueChange={(value) => updateDesignPillar(key, value)}
        disabled={readOnly}
      >
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}...`} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">
          {capsule ? 'Edit' : 'Create'} Visual Style Capsule
        </h2>
        <p className="text-muted-foreground">
          Define the visual characteristics that will guide AI image and video generation
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
          <CardDescription>
            Give your visual style capsule a name and choose where to store it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Capsule Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="e.g., Neo-Noir Cinematic"
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Design Pillars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Design Pillars</CardTitle>
          <CardDescription>
            Define the core visual characteristics that make up this style
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderDesignPillarSelect('colorPalette', 'Color Palette', DESIGN_PILLAR_OPTIONS.colorPalette)}
            {renderDesignPillarSelect('mood', 'Mood', DESIGN_PILLAR_OPTIONS.mood)}
            {renderDesignPillarSelect('medium', 'Medium', DESIGN_PILLAR_OPTIONS.medium)}
            {renderDesignPillarSelect('lighting', 'Lighting', DESIGN_PILLAR_OPTIONS.lighting)}
            {renderDesignPillarSelect('cameraLanguage', 'Camera Language', DESIGN_PILLAR_OPTIONS.cameraLanguage)}
          </div>

          {/* Selected Pillars Summary */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium">Selected Design Pillars</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(formData.designPillars).map(([key, value]) => (
                value ? (
                  <Badge key={key} variant="secondary" className="capitalize">
                    {key}: {value}
                  </Badge>
                ) : null
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reference Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reference Images</CardTitle>
          <CardDescription>
            Upload visual references that exemplify this style (PNG, JPG, WebP, max 5MB each)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Uploaded Images</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {existingImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Reference ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                      onClick={() => handleRemoveImage(imageUrl, index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image Uploader */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Add More Images</Label>
            <ImageUploader
              onImagesUploaded={handleImagesUploaded}
              maxFiles={5}
              acceptedTypes={['image/png', 'image/jpeg', 'image/webp']}
            />
          </div>
        </CardContent>
      </Card>

      {/* Descriptor Strings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Descriptors</CardTitle>
          <CardDescription>
            Provide any additional descriptive text that helps define this visual style
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.descriptorStrings}
            onChange={(e) => updateFormData({ descriptorStrings: e.target.value })}
            placeholder="e.g., Rain-slicked streets, neon signs reflecting in puddles, deep shadows obscuring faces..."
            rows={4}
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Separator />
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading || readOnly}>
          {loading ? 'Creating...' : readOnly ? 'Read Only' : 'Create Visual Style Capsule'}
        </Button>
      </div>
    </div>
  );
}
