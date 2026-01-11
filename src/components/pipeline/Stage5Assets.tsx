import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, Package, Sparkles, Check, Image, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useStageState } from '@/lib/hooks/useStageState';
import { stageStateService } from '@/lib/services/stageStateService';
import { imageService } from '@/lib/services/imageService';
import { StyleCapsuleSelector } from '@/components/styleCapsules/StyleCapsuleSelector';

interface Asset {
  id: string;
  type: 'character' | 'location' | 'prop';
  name: string;
  description: string;
  hasImageKey: boolean;
  imageUrl?: string;
}

// Default content structure for Stage 5
const getDefaultContent = () => ({
  visualStyleCapsuleId: '',
  assets: [] as Asset[],
  assetsLocked: false
});

interface Stage5AssetsProps {
  projectId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage5Assets({ projectId, onComplete, onBack }: Stage5AssetsProps) {
  const { stageState, updateStageState, isLoading } = useStageState(projectId, 5);

  const content = stageState?.content || getDefaultContent();
  const [assets, setAssets] = useState<Asset[]>(content.assets || []);
  const [visualStyleCapsuleId, setVisualStyleCapsuleId] = useState<string>(content.visualStyleCapsuleId || '');
  const [isLocking, setIsLocking] = useState(false);

  // Load assets from Stage 4 script extraction (this would come from a service call)
  useEffect(() => {
    // TODO: Load assets from Stage 4 script analysis
    // For now, use mock assets until script analysis is implemented
    const mockAssets: Asset[] = [
      { id: '1', type: 'character', name: 'James Callahan', description: 'Retired astronaut, 65, gaunt but dignified. Silver hair, weathered face with kind eyes.', hasImageKey: false },
      { id: '2', type: 'character', name: 'Elena Callahan', description: 'Successful architect, 38, polished and precise. Dark hair in professional updo.', hasImageKey: false },
      { id: '3', type: 'character', name: 'Marcus', description: 'Teenager, 16, lanky with headphones. Curious eyes, guarded demeanor.', hasImageKey: false },
      { id: '4', type: 'location', name: "James's Home", description: 'Modest suburban living room with faded photographs, worn leather furniture, afternoon light.', hasImageKey: false },
      { id: '5', type: 'location', name: 'Architecture Firm', description: 'Modern glass and steel office. Clean lines, natural light, professional atmosphere.', hasImageKey: false },
      { id: '6', type: 'prop', name: 'Medical Report', description: 'Official hospital document with terminal diagnosis details.', hasImageKey: false },
      { id: '7', type: 'prop', name: 'Unopened Letter', description: 'Aged envelope with feminine handwriting, postmarked 5 years ago from Seattle.', hasImageKey: false },
    ];

    if (assets.length === 0) {
      setAssets(mockAssets);
    }
  }, [assets.length]);

  const getAssetIcon = (type: Asset['type']) => {
    switch (type) { case 'character': return User; case 'location': return MapPin; case 'prop': return Package; }
  };

  const generateImageKey = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    try {
      toast.info('Generating image key...');

      const result = await imageService.generateAssetImageKey(
        projectId,
        asset.description,
        visualStyleCapsuleId || undefined
      );

      // Update the asset with the generated image key
      setAssets(prev => prev.map(a =>
        a.id === assetId
          ? { ...a, hasImageKey: true, imageUrl: result.imageUrl }
          : a
      ));

      toast.success('Image key generated successfully');
    } catch (error) {
      console.error('Failed to generate image key:', error);
      toast.error('Failed to generate image key. Please try again.');
    }
  };

  const handleLockAssets = async () => {
    if (!canProceed) return;

    try {
      setIsLocking(true);

      // Save the current state
      await updateStageState({
        visualStyleCapsuleId,
        assets,
        assetsLocked: true
      });

      // Lock the stage in the backend
      await stageStateService.lockStage(projectId, 5);

      toast.success('Assets locked and Phase A completed!');
      onComplete();
    } catch (error) {
      console.error('Failed to lock assets:', error);
      toast.error('Failed to lock assets. Please try again.');
    } finally {
      setIsLocking(false);
    }
  };

  const allAssetsHaveKeys = assets.every(a => a.hasImageKey);
  const canProceed = visualStyleCapsuleId && allAssetsHaveKeys && !content.assetsLocked;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Global Assets & Style</h2>
            <p className="text-sm text-muted-foreground">Define visual keys for all characters, locations, and props</p>
          </div>
        </div>
        <Button
          variant="gold"
          size="sm"
          onClick={handleLockAssets}
          disabled={!canProceed || isLocking}
          className="gap-2"
        >
          <Lock className="w-4 h-4" />
          {isLocking ? 'Locking Assets...' : 'Lock Assets & Begin Production'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Visual Style Selection */}
          <section className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-foreground">Visual Style Capsule</h3>
            <p className="text-sm text-muted-foreground">
              Select a visual style capsule to define the aesthetic for all generated images and videos in this project.
            </p>
            <StyleCapsuleSelector
              type="visual"
              value={visualStyleCapsuleId}
              onChange={async (capsuleId) => {
                setVisualStyleCapsuleId(capsuleId);
                await updateStageState({
                  visualStyleCapsuleId: capsuleId,
                  assets,
                  assetsLocked: content.assetsLocked
                });
              }}
              required={true}
              showPreview={true}
            />
          </section>

          {/* Assets Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-foreground">Extracted Assets</h3>
              <span className="text-sm text-muted-foreground">{assets.filter(a => a.hasImageKey).length}/{assets.length} image keys generated</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assets.map(asset => {
                const Icon = getAssetIcon(asset.type);
                return (
                  <motion.div key={asset.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn('p-4 rounded-xl border transition-all', asset.hasImageKey ? 'bg-success/10 border-success/50' : 'bg-card border-border')}>
                    <div className="flex items-start gap-3">
                      <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0', asset.hasImageKey ? 'bg-success/20 text-success' : 'bg-secondary text-muted-foreground')}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{asset.name}</h4>
                          {asset.hasImageKey && <Check className="w-4 h-4 text-success" />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{asset.description}</p>
                        {!asset.hasImageKey && (
                          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => generateImageKey(asset.id)}>
                            <Sparkles className="w-4 h-4" />Generate Image Key
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
