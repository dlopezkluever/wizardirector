import { useState, useEffect } from 'react';
import { X, Plus, Info, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import { styleCapsuleService } from '@/lib/services/styleCapsuleService';
import type {
  WritingStyleCapsuleFormData,
  WritingStyleCapsuleCreate
} from '@/types/styleCapsule';
import { validateWritingStyleCapsule, DEFAULT_WRITING_CAPSULE_FORM } from '@/types/styleCapsule';

interface WritingStyleCapsuleEditorProps {
  capsule?: any; // For editing existing capsules
  onSave: () => void;
  onCancel: () => void;
  readOnly?: boolean;
}

export function WritingStyleCapsuleEditor({
  capsule,
  onSave,
  onCancel,
  readOnly = false
}: WritingStyleCapsuleEditorProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<WritingStyleCapsuleFormData>(
    capsule ? {
      name: capsule.name || '',
      exampleTextExcerpts: capsule.exampleTextExcerpts || [''],
      styleLabels: capsule.styleLabels || [],
      negativeConstraints: capsule.negativeConstraints || [],
      freeformNotes: capsule.freeformNotes || '',
      isAdvancedMode: false
    } : DEFAULT_WRITING_CAPSULE_FORM
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  const updateFormData = (updates: Partial<WritingStyleCapsuleFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const addExampleExcerpt = () => {
    updateFormData({
      exampleTextExcerpts: [...formData.exampleTextExcerpts, '']
    });
  };

  const updateExampleExcerpt = (index: number, value: string) => {
    const newExcerpts = [...formData.exampleTextExcerpts];
    newExcerpts[index] = value;
    updateFormData({ exampleTextExcerpts: newExcerpts });
  };

  const removeExampleExcerpt = (index: number) => {
    if (formData.exampleTextExcerpts.length > 1) {
      const newExcerpts = formData.exampleTextExcerpts.filter((_, i) => i !== index);
      updateFormData({ exampleTextExcerpts: newExcerpts });
    }
  };

  const addStyleLabel = () => {
    updateFormData({
      styleLabels: [...formData.styleLabels, '']
    });
  };

  const updateStyleLabel = (index: number, value: string) => {
    const newLabels = [...formData.styleLabels];
    newLabels[index] = value;
    updateFormData({ styleLabels: newLabels });
  };

  const removeStyleLabel = (index: number) => {
    const newLabels = formData.styleLabels.filter((_, i) => i !== index);
    updateFormData({ styleLabels: newLabels });
  };

  const addNegativeConstraint = () => {
    updateFormData({
      negativeConstraints: [...formData.negativeConstraints, '']
    });
  };

  const updateNegativeConstraint = (index: number, value: string) => {
    const newConstraints = [...formData.negativeConstraints];
    newConstraints[index] = value;
    updateFormData({ negativeConstraints: newConstraints });
  };

  const removeNegativeConstraint = (index: number) => {
    const newConstraints = formData.negativeConstraints.filter((_, i) => i !== index);
    updateFormData({ negativeConstraints: newConstraints });
  };

  const validateForm = (): boolean => {
    const createData: Partial<WritingStyleCapsuleCreate> = {
      name: formData.name,
      exampleTextExcerpts: formData.exampleTextExcerpts.filter(ex => ex.trim()),
      styleLabels: formData.styleLabels.filter(label => label.trim()),
      negativeConstraints: formData.negativeConstraints.filter(constraint => constraint.trim()),
      freeformNotes: formData.freeformNotes.trim() || undefined
    };

    const validationErrors = validateWritingStyleCapsule(createData);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const createData: WritingStyleCapsuleCreate = {
        name: formData.name,
        type: 'writing',
        exampleTextExcerpts: formData.exampleTextExcerpts.filter(ex => ex.trim()),
        styleLabels: formData.styleLabels.filter(label => label.trim()),
        negativeConstraints: formData.negativeConstraints.filter(constraint => constraint.trim()),
        freeformNotes: formData.freeformNotes.trim() || undefined
      };

      await styleCapsuleService.createCapsule(createData);
      onSave();
    } catch (error) {
      console.error('Failed to create writing style capsule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create style capsule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    const styleInjection = `
Example excerpts:
${formData.exampleTextExcerpts.filter(ex => ex.trim()).map(ex => `"${ex}"`).join('\n')}

Style characteristics: ${formData.styleLabels.filter(label => label.trim()).join(', ')}

${formData.negativeConstraints.filter(constraint => constraint.trim()).length > 0
  ? `Avoid: ${formData.negativeConstraints.filter(constraint => constraint.trim()).join(', ')}`
  : ''}

${formData.freeformNotes.trim() ? `Additional notes: ${formData.freeformNotes}` : ''}
    `.trim();

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Prompt Injection Preview</h3>
          <Badge variant="outline">What the AI will see</Badge>
        </div>
        <Card>
          <CardContent className="pt-4">
            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-md">
              {styleInjection}
            </pre>
          </CardContent>
        </Card>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This preview shows how your style capsule will be injected into AI prompts.
            The AI will imitate these stylistic characteristics without copying the specific content.
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {capsule ? 'Edit' : 'Create'} Writing Style Capsule
          </h2>
          <p className="text-muted-foreground">
            Define the writing characteristics that will guide AI text generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {previewMode ? 'Hide' : 'Show'} Preview
          </Button>
        </div>
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

      {previewMode ? (
        renderPreview()
      ) : (
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>
                Give your style capsule a name and choose where to store it
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
                    placeholder="e.g., Hemingway Minimalist"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Example Text Excerpts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Example Text Excerpts *</CardTitle>
              <CardDescription>
                Provide sample text that demonstrates the writing style you want to emulate.
                The AI will learn stylistic patterns without copying specific content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.exampleTextExcerpts.map((excerpt, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`excerpt-${index}`}>
                      Example {index + 1}
                    </Label>
                    {formData.exampleTextExcerpts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExampleExcerpt(index)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        disabled={readOnly}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id={`excerpt-${index}`}
                    value={excerpt}
                    onChange={(e) => updateExampleExcerpt(index, e.target.value)}
                    placeholder="Paste or write a sample paragraph that demonstrates your desired writing style..."
                    rows={4}
                    disabled={readOnly}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addExampleExcerpt}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Example
              </Button>
            </CardContent>
          </Card>

          {/* Advanced Mode Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="advanced-mode" className="text-base font-medium">
                Advanced Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable detailed style controls for power users
              </p>
            </div>
            <Switch
              id="advanced-mode"
              checked={formData.isAdvancedMode}
              onCheckedChange={(checked) => updateFormData({ isAdvancedMode: checked })}
            />
          </div>

          {/* Advanced Controls */}
          {formData.isAdvancedMode && (
            <>
              {/* Style Labels */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Style Labels</CardTitle>
                  <CardDescription>
                    Add descriptive tags that characterize the writing style
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.styleLabels.map((label, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={label}
                        onChange={(e) => updateStyleLabel(index, e.target.value)}
                        placeholder="e.g., minimalist, terse, cynical"
                        disabled={readOnly}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStyleLabel(index)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        disabled={readOnly}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addStyleLabel}
                    className="w-full"
                    disabled={readOnly}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Style Label
                  </Button>
                </CardContent>
              </Card>

              {/* Negative Constraints */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Negative Constraints</CardTitle>
                  <CardDescription>
                    Specify what the AI should avoid in this writing style
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.negativeConstraints.map((constraint, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={constraint}
                        onChange={(e) => updateNegativeConstraint(index, e.target.value)}
                        placeholder="e.g., avoid metaphors, no humor"
                        disabled={readOnly}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNegativeConstraint(index)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        disabled={readOnly}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addNegativeConstraint}
                    className="w-full"
                    disabled={readOnly}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Negative Constraint
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Freeform Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
              <CardDescription>
                Any other stylistic guidance or context for this writing style
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.freeformNotes}
                onChange={(e) => updateFormData({ freeformNotes: e.target.value })}
                placeholder="Optional notes about tone, rhythm, or other stylistic considerations..."
                rows={3}
                disabled={readOnly}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading || readOnly}>
          {loading ? 'Creating...' : readOnly ? 'Read Only' : 'Create Style Capsule'}
        </Button>
      </div>
    </div>
  );
}
