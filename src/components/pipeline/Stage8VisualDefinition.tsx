import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  MapPin, 
  Package,
  Check,
  Lock,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  Edit3,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { SceneAsset } from '@/types/scene';

// Mock scene assets
const mockAssets: SceneAsset[] = [
  {
    id: 'asset-1',
    sceneId: 'scene-1',
    name: 'Maya',
    type: 'character',
    source: 'master',
    reviewStatus: 'locked',
    description: 'A 28-year-old woman with weary eyes and disheveled dark hair. She wears a worn leather jacket over a faded band t-shirt. Her face shows exhaustion but determination. Slight smudges under her eyes suggest sleepless nights.',
    imageKey: '/placeholder.svg',
    masterAssetId: 'master-maya'
  },
  {
    id: 'asset-2',
    sceneId: 'scene-1',
    name: 'Train Platform',
    type: 'location',
    source: 'master',
    reviewStatus: 'edited',
    description: 'An empty train station platform at dawn. Flickering fluorescent lights cast harsh shadows. The concrete floor is stained and cracked. A single bench sits abandoned near a rusted schedule board.',
    imageKey: '/placeholder.svg',
    masterAssetId: 'master-train-platform'
  },
  {
    id: 'asset-3',
    sceneId: 'scene-1',
    name: 'Maya\'s Suitcase',
    type: 'prop',
    source: 'master',
    reviewStatus: 'unreviewed',
    description: 'A small, battered leather suitcase with peeling stickers from various cities. The handle is wrapped with electrical tape. One corner is dented.',
    masterAssetId: 'master-suitcase'
  },
];

const typeIcons = {
  character: Users,
  location: MapPin,
  prop: Package,
};

const statusColors = {
  unreviewed: 'bg-muted text-muted-foreground',
  edited: 'bg-amber-500/20 text-amber-400',
  locked: 'bg-emerald-500/20 text-emerald-400',
};

interface Stage8VisualDefinitionProps {
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage8VisualDefinition({ sceneId, onComplete, onBack }: Stage8VisualDefinitionProps) {
  const [assets, setAssets] = useState<SceneAsset[]>(mockAssets);
  const [selectedAsset, setSelectedAsset] = useState<SceneAsset | null>(mockAssets[0]);
  const [selectedForGeneration, setSelectedForGeneration] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAssetUpdate = (assetId: string, field: keyof SceneAsset, value: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId 
        ? { ...asset, [field]: value, reviewStatus: 'edited' as const } 
        : asset
    ));
    if (selectedAsset?.id === assetId) {
      setSelectedAsset(prev => prev ? { ...prev, [field]: value, reviewStatus: 'edited' as const } : null);
    }
  };

  const handleLockAsset = (assetId: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, reviewStatus: 'locked' as const } : asset
    ));
    if (selectedAsset?.id === assetId) {
      setSelectedAsset(prev => prev ? { ...prev, reviewStatus: 'locked' as const } : null);
    }
  };

  const handleToggleSelection = (assetId: string) => {
    setSelectedForGeneration(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleBulkGenerate = async () => {
    if (selectedForGeneration.length === 0) return;
    
    setIsGenerating(true);
    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAssets(prev => prev.map(asset => 
      selectedForGeneration.includes(asset.id)
        ? { ...asset, imageKey: '/placeholder.svg', reviewStatus: 'edited' as const }
        : asset
    ));
    
    setSelectedForGeneration([]);
    setIsGenerating(false);
  };

  const groupedAssets = {
    character: assets.filter(a => a.type === 'character'),
    location: assets.filter(a => a.type === 'location'),
    prop: assets.filter(a => a.type === 'prop'),
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Scene Visual Elements Panel - Left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-80 border-r border-border/50 bg-card/30 backdrop-blur-sm flex flex-col"
      >
        <div className="p-4 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Scene Assets</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {assets.length} assets • {assets.filter(a => a.reviewStatus === 'locked').length} locked
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {(Object.entries(groupedAssets) as [keyof typeof typeIcons, SceneAsset[]][]).map(([type, typeAssets]) => {
              const Icon = typeIcons[type];
              return (
                <div key={type} className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-foreground capitalize">{type}s</span>
                    <span className="text-xs text-muted-foreground">({typeAssets.length})</span>
                  </div>
                  
                  {typeAssets.map(asset => (
                    <motion.div
                      key={asset.id}
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        'p-3 rounded-lg mb-1 cursor-pointer transition-all',
                        selectedAsset?.id === asset.id 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'bg-card/50 border border-border/30 hover:border-border'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedForGeneration.includes(asset.id)}
                          onCheckedChange={() => handleToggleSelection(asset.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div 
                          className="flex-1 min-w-0"
                          onClick={() => setSelectedAsset(asset)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground truncate">
                              {asset.name}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className={cn('text-[10px] ml-2', statusColors[asset.reviewStatus])}
                            >
                              {asset.reviewStatus === 'locked' && <Lock className="w-2 h-2 mr-1" />}
                              {asset.reviewStatus}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">
                            {asset.source === 'master' ? 'Master Asset' : asset.source}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Bulk Generation Controls */}
        <div className="p-4 border-t border-border/50">
          <Button
            variant="gold"
            className="w-full"
            disabled={selectedForGeneration.length === 0 || isGenerating}
            onClick={handleBulkGenerate}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Visuals ({selectedForGeneration.length})
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Visual State Editor - Center */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {selectedAsset ? (
          <>
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = typeIcons[selectedAsset.type];
                  return <Icon className="w-5 h-5 text-primary" />;
                })()}
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedAsset.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedAsset.source === 'master' ? 'Inherited from Master Assets' : 'Scene-specific asset'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedAsset.reviewStatus !== 'locked' && (
                  <Button 
                    variant="gold" 
                    size="sm"
                    onClick={() => handleLockAsset(selectedAsset.id)}
                  >
                    <Lock className="w-4 h-4 mr-1" />
                    Lock Asset
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Image Key */}
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    Visual Reference (Image Key)
                  </label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-video bg-muted/50 rounded-lg border border-border/30 overflow-hidden relative group">
                      {selectedAsset.imageKey ? (
                        <>
                          <img 
                            src={selectedAsset.imageKey} 
                            alt={selectedAsset.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button variant="glass" size="sm">
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Regenerate
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">No image generated</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="w-4 h-4 mr-1" />
                        Upload Reference
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <Sparkles className="w-4 h-4 mr-1" />
                        Generate New
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                    <Edit3 className="w-4 h-4 text-primary" />
                    Visual State Description
                  </label>
                  <Textarea
                    value={selectedAsset.description}
                    onChange={(e) => handleAssetUpdate(selectedAsset.id, 'description', e.target.value)}
                    placeholder="Describe the starting visual state for this asset in this scene..."
                    rows={6}
                    disabled={selectedAsset.reviewStatus === 'locked'}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This description defines how {selectedAsset.name} appears at the start of this scene.
                    Mid-scene visual changes are handled in Stage 10.
                  </p>
                </div>

                {/* Source Info */}
                {selectedAsset.masterAssetId && (
                  <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                    <h4 className="text-sm font-medium text-foreground mb-2">Master Asset Link</h4>
                    <p className="text-xs text-muted-foreground">
                      This asset inherits from Master Asset: <span className="text-primary">{selectedAsset.masterAssetId}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Changes here create a Scene Instance and won't affect the Master Asset.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Select an asset to edit</p>
          </div>
        )}
      </motion.div>

      {/* Asset Drawer - Right */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-64 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col"
      >
        <div className="p-4 border-b border-border/50">
          <h3 className="font-display text-sm font-semibold text-foreground">Asset Library</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Drag assets or create new
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <div className="bg-card/50 rounded-lg p-3 border border-dashed border-border/50 text-center">
              <Plus className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
              <span className="text-xs text-muted-foreground">Create Scene Asset</span>
            </div>

            <div className="text-xs text-muted-foreground px-2">Master Assets</div>
            
            {['Maya', 'The Stranger', 'Train Station', 'City Street'].map(name => (
              <div 
                key={name}
                className="bg-card/50 rounded-lg p-2 border border-border/30 cursor-grab hover:border-primary/30 transition-colors"
              >
                <span className="text-sm text-foreground">{name}</span>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/50 space-y-2">
          <Button variant="ghost" size="sm" className="w-full" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="gold" size="sm" className="w-full" onClick={onComplete}>
            <Check className="w-4 h-4 mr-2" />
            Proceed
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
