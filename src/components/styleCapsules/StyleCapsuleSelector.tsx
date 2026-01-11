import { useState, useEffect, useMemo } from 'react';
import { Search, Palette, BookOpen, Star, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

import { styleCapsuleService } from '@/lib/services/styleCapsuleService';
import type { StyleCapsule, StyleCapsuleType } from '@/types/styleCapsule';
import { isWritingStyleCapsule, isVisualStyleCapsule } from '@/types/styleCapsule';

interface StyleCapsuleSelectorProps {
  type: StyleCapsuleType;
  value?: string;
  onChange: (capsuleId: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showPreview?: boolean;
}

export function StyleCapsuleSelector({
  type,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className,
  showPreview = true
}: StyleCapsuleSelectorProps) {
  const [capsules, setCapsules] = useState<StyleCapsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewCapsule, setPreviewCapsule] = useState<StyleCapsule | null>(null);

  // Load capsules on mount
  useEffect(() => {
    loadCapsules();
  }, []);

  const loadCapsules = async () => {
    try {
      setLoading(true);
      const data = await styleCapsuleService.getCapsules();
      // Filter by type
      const filteredCapsules = data.filter(capsule => capsule.type === type);
      setCapsules(filteredCapsules);
    } catch (error) {
      console.error('Failed to load style capsules:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter capsules based on search
  const filteredCapsules = useMemo(() => {
    if (!searchQuery) return capsules;

    return capsules.filter(capsule =>
      capsule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (isWritingStyleCapsule(capsule) && capsule.styleLabels?.some(label =>
        label.toLowerCase().includes(searchQuery.toLowerCase())
      )) ||
      (isVisualStyleCapsule(capsule) && Object.values(capsule.designPillars || {}).some(value =>
        value?.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    );
  }, [capsules, searchQuery]);

  // Group capsules by preset vs custom
  const groupedCapsules = useMemo(() => {
    const presets = filteredCapsules.filter(c => c.isPreset);
    const custom = filteredCapsules.filter(c => !c.isPreset);

    return { presets, custom };
  }, [filteredCapsules]);

  const selectedCapsule = capsules.find(c => c.id === value);

  const handleSelect = (capsuleId: string) => {
    onChange(capsuleId);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
  };

  const renderCapsulePreview = (capsule: StyleCapsule) => {
    const isWriting = isWritingStyleCapsule(capsule);
    const isVisual = isVisualStyleCapsule(capsule);

    return (
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isWriting && <BookOpen className="w-4 h-4 text-blue-500" />}
              {isVisual && <Palette className="w-4 h-4 text-green-500" />}
              <CardTitle className="text-lg">{capsule.name}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={capsule.isPreset ? "secondary" : "outline"}>
                {capsule.isPreset ? 'Preset' : 'Custom'}
              </Badge>
              {capsule.isFavorite && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isWriting && capsule.styleLabels && capsule.styleLabels.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Style Labels</p>
              <div className="flex flex-wrap gap-1">
                {capsule.styleLabels.slice(0, 5).map((label, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
                {capsule.styleLabels.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{capsule.styleLabels.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {isVisual && capsule.designPillars && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Design Pillars</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.entries(capsule.designPillars).slice(0, 6).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium capitalize">{key}:</span> {value}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isWriting && capsule.exampleTextExcerpts && capsule.exampleTextExcerpts.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Example</p>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {capsule.exampleTextExcerpts[0]}
              </p>
            </div>
          )}

          {isVisual && capsule.descriptorStrings && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {capsule.descriptorStrings}
              </p>
            </div>
          )}

          {isVisual && capsule.referenceImageUrls && capsule.referenceImageUrls.length > 0 && (
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {capsule.referenceImageUrls.length} reference image{capsule.referenceImageUrls.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCapsuleItem = (capsule: StyleCapsule) => {
    const isSelected = capsule.id === value;
    const isWriting = isWritingStyleCapsule(capsule);
    const isVisual = isVisualStyleCapsule(capsule);

    return (
      <CommandItem
        key={capsule.id}
        value={capsule.id}
        onSelect={() => handleSelect(capsule.id)}
        className="flex items-center justify-between p-3 cursor-pointer"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {isWriting && <BookOpen className="w-4 h-4 text-blue-500" />}
            {isVisual && <Palette className="w-4 h-4 text-green-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{capsule.name}</span>
              {capsule.isFavorite && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={capsule.isPreset ? "secondary" : "outline"} className="text-xs">
                {capsule.isPreset ? 'Preset' : 'Custom'}
              </Badge>
              {isWriting && capsule.styleLabels && capsule.styleLabels.length > 0 && (
                <span className="text-xs text-muted-foreground truncate">
                  {capsule.styleLabels.slice(0, 2).join(', ')}
                  {capsule.styleLabels.length > 2 && ` +${capsule.styleLabels.length - 2}`}
                </span>
              )}
              {isVisual && capsule.designPillars && (
                <span className="text-xs text-muted-foreground">
                  {Object.keys(capsule.designPillars).length} pillars
                </span>
              )}
            </div>
          </div>
        </div>
        {isSelected && <Check className="w-4 h-4 text-primary" />}
      </CommandItem>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label className="text-sm font-medium">
          {type === 'writing' ? 'Writing Style' : 'Visual Style'}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex items-center justify-center h-10 px-3 border rounded-md">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium">
        {type === 'writing' ? 'Writing Style' : 'Visual Style'}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 truncate">
              {selectedCapsule ? (
                <>
                  {isWritingStyleCapsule(selectedCapsule) && <BookOpen className="w-4 h-4 text-blue-500" />}
                  {isVisualStyleCapsule(selectedCapsule) && <Palette className="w-4 h-4 text-green-500" />}
                  <span className="truncate">{selectedCapsule.name}</span>
                  {selectedCapsule.isFavorite && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                </>
              ) : (
                <span className="text-muted-foreground">
                  {placeholder || `Select ${type} style capsule...`}
                </span>
              )}
            </div>
            {selectedCapsule && showPreview && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-2 h-6 w-6 p-0">
                    <Search className="w-3 h-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Style Capsule Preview</DialogTitle>
                    <DialogDescription>
                      Detailed view of the selected style capsule
                    </DialogDescription>
                  </DialogHeader>
                  {renderCapsulePreview(selectedCapsule)}
                </DialogContent>
              </Dialog>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder={`Search ${type} style capsules...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No style capsules found.</CommandEmpty>

              {/* Preset Capsules */}
              {groupedCapsules.presets.length > 0 && (
                <CommandGroup heading="Preset Capsules">
                  {groupedCapsules.presets.map(renderCapsuleItem)}
                </CommandGroup>
              )}

              {/* Custom Capsules */}
              {groupedCapsules.custom.length > 0 && (
                <>
                  {groupedCapsules.presets.length > 0 && <Separator className="my-2" />}
                  <CommandGroup heading="Custom Capsules">
                    {groupedCapsules.custom.map(renderCapsuleItem)}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Clear button */}
      {selectedCapsule && !disabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          Clear selection
        </Button>
      )}

      {/* Summary */}
      {selectedCapsule && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {selectedCapsule.isPreset ? 'Preset' : 'Custom'}
          </Badge>
          {isWritingStyleCapsule(selectedCapsule) && selectedCapsule.styleLabels && (
            <span>{selectedCapsule.styleLabels.length} style labels</span>
          )}
          {isVisualStyleCapsule(selectedCapsule) && selectedCapsule.designPillars && (
            <span>{Object.keys(selectedCapsule.designPillars).length} design pillars</span>
          )}
        </div>
      )}
    </div>
  );
}
