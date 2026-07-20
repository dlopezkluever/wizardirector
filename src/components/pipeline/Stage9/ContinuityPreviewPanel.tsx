import { AlertTriangle, ArrowLeft, ImageOff, Layers, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  ContinuityStrength,
  GenerationReferenceManifestEntry,
  ShotContinuityPreview,
} from '@/types/locationContinuity';

interface ContinuityPreviewPanelProps {
  preview?: ShotContinuityPreview | null;
  isLoading?: boolean;
  onRepairInStage8?: () => void;
}

const STRENGTH_LABEL: Record<ContinuityStrength, string> = {
  strong: 'Strong continuity',
  usable: 'Usable continuity',
  weak: 'Weak continuity',
  missing: 'No continuity',
};

const STRENGTH_CLASSES: Record<ContinuityStrength, string> = {
  strong: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  usable: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  weak: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  missing: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const ROLE_LABELS: Record<GenerationReferenceManifestEntry['role'], string> = {
  location_direction_main: 'Direction view',
  location_establishing_context: 'Establishing view',
  location_asset_fallback: 'Location fallback',
  continuity_base_frame: 'Continuity base frame',
  blocking_composition_reference: 'Blocking reference',
  blocking_start_frame: 'Blocking start frame',
  blocking_end_frame: 'Blocking end frame',
  character_identity: 'Character identity',
  prop_identity: 'Prop identity',
  style_reference: 'Style reference',
  manual_reference: 'Manual reference',
};

function ReferenceThumb({ entry }: { entry: GenerationReferenceManifestEntry }) {
  return (
    <div className="flex gap-2 items-start p-2 rounded-md bg-card/40 border border-border/40">
      <div className="w-12 h-12 rounded overflow-hidden bg-muted/40 flex-shrink-0 flex items-center justify-center">
        {entry.url ? (
          <img src={entry.url} alt={entry.assetName} className="w-full h-full object-cover" />
        ) : (
          <ImageOff className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-foreground truncate">{entry.assetName}</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
            {ROLE_LABELS[entry.role] || entry.role}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-muted-foreground">
            {entry.providerRole}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{entry.reason}</p>
      </div>
    </div>
  );
}

export function ContinuityPreviewPanel({ preview, isLoading, onRepairInStage8 }: ContinuityPreviewPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/40 bg-card/30 p-3 text-xs text-muted-foreground">
        Loading continuity preview...
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="rounded-lg border border-border/40 bg-card/30 p-3 text-xs text-muted-foreground">
        No continuity preview available for this shot.
      </div>
    );
  }

  const {
    locationState,
    direction,
    strength,
    referenceManifest,
    fallbackChain,
    adaptationNotes,
    riskNotices,
    generationMode,
    continuityBase,
    continuityBaseCandidates = [],
  } = preview;
  const hasReferences = referenceManifest.length > 0;
  const showRepair = (strength === 'weak' || strength === 'missing' || riskNotices.length > 0) && !!onRepairInStage8;
  const topBaseCandidate = continuityBaseCandidates[0];

  return (
    <div className="rounded-lg border border-border/40 bg-card/30 p-3 space-y-3">
      {/* Header: strength + location/direction summary */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('text-[10px]', STRENGTH_CLASSES[strength])}>
            <ShieldCheck className="w-3 h-3 mr-1" />
            {STRENGTH_LABEL[strength]}
          </Badge>
          <Badge variant="outline" className="text-[10px] capitalize">
            <Sparkles className="w-3 h-3 mr-1" />
            {generationMode.replace('_', ' ')}
          </Badge>
          {locationState.locationName ? (
            <Badge variant="outline" className="text-[10px]">
              <MapPin className="w-3 h-3 mr-1" />
              {locationState.locationName}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/30">
              <MapPin className="w-3 h-3 mr-1" />
              Unlinked location
            </Badge>
          )}
          {direction && (
            <Badge variant="outline" className="text-[10px]">
              {direction.alias || direction.name.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
        {showRepair && (
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onRepairInStage8}>
            <ArrowLeft className="w-3 h-3 mr-1" />
            Repair in Stage 8
          </Button>
        )}
      </div>

      {(continuityBase || topBaseCandidate) && (
        <div className="rounded-md border border-border/30 bg-background/25 p-2 flex items-center gap-2">
          <div className="w-12 h-9 rounded overflow-hidden bg-muted/50 shrink-0">
            <img
              src={(continuityBase || topBaseCandidate)!.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                {continuityBase ? 'Selected base' : 'Suggested base'}
              </Badge>
              <span className="text-xs text-foreground truncate">
                Shot {(continuityBase || topBaseCandidate)!.sourceShotLabel}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {(continuityBase || topBaseCandidate)!.reason}
            </p>
          </div>
        </div>
      )}

      {/* Reference manifest */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Generation references
          </span>
          <span className="text-[10px] text-muted-foreground">({referenceManifest.length})</span>
        </div>
        {hasReferences ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {referenceManifest.map(entry => (
              <ReferenceThumb key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-amber-300 italic">
            No reference images will be attached. Generation will rely on text-only context.
          </div>
        )}
      </div>

      {/* Fallback chain */}
      {fallbackChain.length > 0 && (
        <div className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/80">Fallback chain: </span>
          {fallbackChain.join(' → ')}
        </div>
      )}

      {/* Adaptation notes */}
      {adaptationNotes.length > 0 && (
        <div className="text-[11px] text-foreground/80 space-y-1">
          {adaptationNotes.map((note, idx) => (
            <p key={idx} className="leading-snug">
              <span className="text-muted-foreground">Adaptation:</span> {note}
            </p>
          ))}
        </div>
      )}

      {/* Risk notices */}
      {riskNotices.length > 0 && (
        <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-2 space-y-1">
          {riskNotices.map((notice, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-300">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="leading-snug">{notice}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
