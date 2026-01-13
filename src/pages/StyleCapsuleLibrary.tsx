import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Heart, Star, BookOpen, Image, Filter, Grid3X3, List } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

import { styleCapsuleService } from '@/lib/services/styleCapsuleService';
import type {
  StyleCapsule,
  StyleCapsuleLibrary,
  WritingStyleCapsule,
  VisualStyleCapsule,
  StyleCapsuleFilter
} from '@/types/styleCapsule';
import { isWritingStyleCapsule, isVisualStyleCapsule } from '@/types/styleCapsule';

import { WritingStyleCapsuleEditor } from '@/components/styleCapsules/WritingStyleCapsuleEditor';
import { VisualStyleCapsuleEditor } from '@/components/styleCapsules/VisualStyleCapsuleEditor';

const StyleCapsuleLibrary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [capsules, setCapsules] = useState<StyleCapsule[]>([]);
  const [libraries, setLibraries] = useState<StyleCapsuleLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<StyleCapsuleFilter>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCapsule, setSelectedCapsule] = useState<StyleCapsule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createCapsuleType, setCreateCapsuleType] = useState<'writing' | 'visual'>('writing');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [capsuleToDelete, setCapsuleToDelete] = useState<StyleCapsule | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [capsulesData, librariesData] = await Promise.all([
        styleCapsuleService.getCapsules(),
        styleCapsuleService.getLibraries()
      ]);
      setCapsules(capsulesData);
      setLibraries(librariesData);
    } catch (error) {
      console.error('Failed to load style capsule data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load style capsules. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter capsules based on search and filters
  const filteredCapsules = capsules.filter(capsule => {
    // Search filter
    if (searchQuery && !capsule.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filter.type && capsule.type !== filter.type) {
      return false;
    }

    // Preset filter
    if (filter.isPreset !== undefined && capsule.isPreset !== filter.isPreset) {
      return false;
    }

    // Favorite filter
    if (filter.isFavorite !== undefined && capsule.isFavorite !== filter.isFavorite) {
      return false;
    }

    return true;
  });

  // Separate by type for tabs
  const writingCapsules = filteredCapsules.filter(isWritingStyleCapsule);
  const visualCapsules = filteredCapsules.filter(isVisualStyleCapsule);

  const handleCreateCapsule = (type: 'writing' | 'visual') => {
    setCreateCapsuleType(type);
    setShowCreateDialog(true);
  };

  const handleCapsuleCreated = async () => {
    setShowCreateDialog(false);
    await loadData();
    toast({
      title: 'Success',
      description: 'Style capsule created successfully.',
    });
  };

  const handleToggleFavorite = async (capsule: StyleCapsule) => {
    try {
      await styleCapsuleService.toggleFavorite(capsule.id);
      await loadData();
      toast({
        title: 'Success',
        description: `Style capsule ${capsule.isFavorite ? 'removed from' : 'added to'} favorites.`,
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateCapsule = async (capsule: StyleCapsule) => {
    try {
      // Find user's default library
      const userLibrary = libraries.find(lib => lib.userId && !lib.isPreset);
      if (!userLibrary) {
        toast({
          title: 'Error',
          description: 'Please create a library first.',
          variant: 'destructive',
        });
        return;
      }

      await styleCapsuleService.duplicateCapsule(capsule.id, {
        libraryId: userLibrary.id,
        newName: `${capsule.name} (Copy)`
      });

      await loadData();
      toast({
        title: 'Success',
        description: 'Style capsule duplicated successfully.',
      });
    } catch (error) {
      console.error('Failed to duplicate capsule:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate capsule.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCapsule = async () => {
    if (!capsuleToDelete) return;

    try {
      await styleCapsuleService.deleteCapsule(capsuleToDelete.id);
      await loadData();
      toast({
        title: 'Success',
        description: 'Style capsule deleted successfully.',
      });
    } catch (error) {
      console.error('Failed to delete capsule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete capsule.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setCapsuleToDelete(null);
    }
  };

  const renderCapsuleCard = (capsule: StyleCapsule) => {
    const isWriting = isWritingStyleCapsule(capsule);
    const isVisual = isVisualStyleCapsule(capsule);

    return (
      <motion.div
        key={capsule.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {isWriting && <BookOpen className="w-4 h-4 text-blue-500" />}
                {isVisual && <Image className="w-4 h-4 text-green-500" />}
                <CardTitle className="text-lg truncate">{capsule.name}</CardTitle>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(capsule);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Heart className={`w-4 h-4 ${capsule.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Star className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedCapsule(capsule)}>
                      View Details
                    </DropdownMenuItem>
                    {!capsule.isPreset && (
                      <DropdownMenuItem onClick={() => setSelectedCapsule(capsule)}>
                        Edit
                      </DropdownMenuItem>
                    )}
                    {capsule.isPreset && (
                      <DropdownMenuItem onClick={() => handleDuplicateCapsule(capsule)}>
                        Duplicate
                      </DropdownMenuItem>
                    )}
                    {!capsule.isPreset && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setCapsuleToDelete(capsule);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={capsule.isPreset ? "secondary" : "outline"}>
                {capsule.isPreset ? 'Preset' : 'Custom'}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {capsule.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isWriting && (
              <div className="space-y-2">
                {capsule.styleLabels && capsule.styleLabels.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Style Labels</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {capsule.styleLabels.slice(0, 3).map((label, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                      {capsule.styleLabels.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{capsule.styleLabels.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {capsule.exampleTextExcerpts && capsule.exampleTextExcerpts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Examples</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {capsule.exampleTextExcerpts[0]}
                    </p>
                  </div>
                )}
              </div>
            )}
            {isVisual && (
              <div className="space-y-2">
                {capsule.designPillars && Object.keys(capsule.designPillars).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Design Pillars</p>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {Object.entries(capsule.designPillars).slice(0, 4).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-medium capitalize">{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {capsule.referenceImageUrls && capsule.referenceImageUrls.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {capsule.referenceImageUrls.length} reference image{capsule.referenceImageUrls.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading style capsules...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Style Capsule Library</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage style capsules for consistent creative output
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Capsule
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreateCapsule('writing')}>
                <BookOpen className="w-4 h-4 mr-2" />
                Writing Style
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateCapsule('visual')}>
                <Image className="w-4 h-4 mr-2" />
                Visual Style
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search capsules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filter.type || 'all'}
          onValueChange={(value) => setFilter(prev => ({
            ...prev,
            type: value === 'all' ? undefined : value as 'writing' | 'visual'
          }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="writing">Writing</SelectItem>
            <SelectItem value="visual">Visual</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={
            filter.isPreset === undefined ? 'all' :
            filter.isPreset ? 'presets' : 'custom'
          }
          onValueChange={(value) => setFilter(prev => ({
            ...prev,
            isPreset: value === 'all' ? undefined : value === 'presets'
          }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Capsules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Capsules</SelectItem>
            <SelectItem value="presets">Presets</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="writing" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="writing" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Writing Styles ({writingCapsules.length})
          </TabsTrigger>
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Visual Styles ({visualCapsules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="writing" className="mt-6">
          <AnimatePresence mode="wait">
            {writingCapsules.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No writing style capsules found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || Object.keys(filter).length > 0
                    ? 'Try adjusting your search or filters.'
                    : 'Create your first writing style capsule to get started.'
                  }
                </p>
                {!searchQuery && Object.keys(filter).length === 0 && (
                  <Button onClick={() => handleCreateCapsule('writing')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Writing Style
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`grid gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {writingCapsules.map(renderCapsuleCard)}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="visual" className="mt-6">
          <AnimatePresence mode="wait">
            {visualCapsules.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No visual style capsules found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || Object.keys(filter).length > 0
                    ? 'Try adjusting your search or filters.'
                    : 'Create your first visual style capsule to get started.'
                  }
                </p>
                {!searchQuery && Object.keys(filter).length === 0 && (
                  <Button onClick={() => handleCreateCapsule('visual')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Visual Style
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`grid gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {visualCapsules.map(renderCapsuleCard)}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Create Capsule Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Create {createCapsuleType === 'writing' ? 'Writing' : 'Visual'} Style Capsule
            </DialogTitle>
            <DialogDescription>
              Define the stylistic characteristics that will guide AI generation.
            </DialogDescription>
          </DialogHeader>
          {createCapsuleType === 'writing' ? (
            <WritingStyleCapsuleEditor
              libraries={libraries}
              onSave={handleCapsuleCreated}
              onCancel={() => setShowCreateDialog(false)}
            />
          ) : (
            <VisualStyleCapsuleEditor
              libraries={libraries}
              onSave={handleCapsuleCreated}
              onCancel={() => setShowCreateDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Style Capsule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{capsuleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCapsule} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StyleCapsuleLibrary;
