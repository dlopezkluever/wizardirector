/**
 * Content Access Carousel (v2 — 4WT-D)
 * Multi-tab collapsible, resizable panel providing access to:
 *   Tab 1 — Script Excerpt (current scene's script in simplified screenplay format)
 *   Tab 2 — Stills (start frames from all other scenes' shots)
 *   Tab 3 — Clips (video clips from all other scenes' shots)
 *   Tab 4 — Shot List (vertical carousel of shot cards, stages 8-12 only)
 *
 * Replaces v1 which had a Rearview tab.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Image,
  Film,
  Clapperboard,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Camera,
  Clock,
  Play,
  X,
  GripHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { sceneService } from '@/lib/services/sceneService';
import { shotService } from '@/lib/services/shotService';
import { frameService } from '@/lib/services/frameService';
import { checkoutService } from '@/lib/services/checkoutService';
import { cn } from '@/lib/utils';
import type { Shot, FrameStatus } from '@/types/scene';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'script' | 'stills' | 'clips' | 'shots';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

interface SceneStillsData {
  sceneId: string;
  sceneNumber: number;
  stills: {
    shotId: string;
    imageUrl: string;
    frameStatus: FrameStatus;
  }[];
}

interface SceneClipsData {
  sceneId: string;
  sceneNumber: number;
  clips: {
    shotId: string;
    videoUrl: string;
    startFrameUrl: string;
    duration: number;
  }[];
}

export interface ContentAccessCarouselProps {
  projectId: string;
  sceneId: string;
  /** Current pipeline stage number (6-12). Controls tab availability. */
  stageNumber: number;
  /** If provided, used directly. Otherwise derived from scenes query. */
  sceneNumber?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_HEIGHT = 100;
const DEFAULT_HEIGHT_RATIO = 0.25;
const MAX_HEIGHT_RATIO = 0.5;

// Module-level session-persistent state (survives re-renders/navigation, resets on page reload)
let sessionPanelHeight: number | null = null;
let sessionActiveTabId: TabId | null = null;

// ---------------------------------------------------------------------------
// Data aggregation functions
// ---------------------------------------------------------------------------

async function fetchAllStartFrames(
  projectId: string,
  excludeSceneId: string,
  scenes: { id: string; sceneNumber: number }[]
): Promise<SceneStillsData[]> {
  const otherScenes = scenes.filter(s => s.id !== excludeSceneId);

  const results = await Promise.all(
    otherScenes.map(async (scene) => {
      try {
        const framesData = await frameService.fetchFrames(projectId, scene.id);
        return {
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          stills: framesData.shots
            .filter(shot => shot.startFrame?.imageUrl)
            .map(shot => ({
              shotId: shot.shotId,
              imageUrl: shot.startFrame!.imageUrl!,
              frameStatus: shot.startFrame!.status,
            })),
        };
      } catch {
        return { sceneId: scene.id, sceneNumber: scene.sceneNumber, stills: [] };
      }
    })
  );

  return results.filter(r => r.stills.length > 0);
}

async function fetchAllCompletedClips(
  projectId: string,
  excludeSceneId: string,
  scenes: { id: string; sceneNumber: number }[]
): Promise<SceneClipsData[]> {
  const otherScenes = scenes.filter(s => s.id !== excludeSceneId);

  const results = await Promise.all(
    otherScenes.map(async (scene) => {
      try {
        const jobsData = await checkoutService.getVideoJobs(projectId, scene.id);
        const completedJobs = jobsData.jobs.filter(
          job => job.status === 'completed' && job.videoUrl
        );
        return {
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          clips: completedJobs.map(job => ({
            shotId: job.shotId,
            videoUrl: job.videoUrl!,
            startFrameUrl: job.startFrameUrl,
            duration: job.durationSeconds,
          })),
        };
      } catch {
        return { sceneId: scene.id, sceneNumber: scene.sceneNumber, clips: [] };
      }
    })
  );

  return results.filter(r => r.clips.length > 0);
}

// ---------------------------------------------------------------------------
// Script line parser (simplified screenplay formatting)
// ---------------------------------------------------------------------------

type ScriptLineType = 'heading' | 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition' | 'empty';

interface ParsedLine {
  type: ScriptLineType;
  text: string;
}

function parseScriptLines(excerpt: string): ParsedLine[] {
  if (!excerpt) return [];
  const lines = excerpt.split('\n');
  const parsed: ParsedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      parsed.push({ type: 'empty', text: '' });
      continue;
    }

    // Scene heading: starts with INT. / EXT. / I/E.
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/.test(trimmed.toUpperCase())) {
      parsed.push({ type: 'heading', text: trimmed });
      continue;
    }

    // Transition: ends with TO: and is mostly uppercase
    if (/TO:$/i.test(trimmed) && trimmed === trimmed.toUpperCase()) {
      parsed.push({ type: 'transition', text: trimmed });
      continue;
    }

    // Character name: ALL CAPS, at least 2 chars, no lowercase letters, commonly followed by dialogue
    if (
      trimmed.length >= 2 &&
      trimmed === trimmed.toUpperCase() &&
      /^[A-Z]/.test(trimmed) &&
      !/^(INT\.|EXT\.)/.test(trimmed)
    ) {
      parsed.push({ type: 'character', text: trimmed });
      continue;
    }

    // Parenthetical: starts with (
    if (trimmed.startsWith('(')) {
      parsed.push({ type: 'parenthetical', text: trimmed });
      continue;
    }

    // Check if previous non-empty line was a character or parenthetical → this is dialogue
    const prevNonEmpty = [...parsed].reverse().find(l => l.type !== 'empty');
    if (prevNonEmpty && (prevNonEmpty.type === 'character' || prevNonEmpty.type === 'parenthetical')) {
      parsed.push({ type: 'dialogue', text: trimmed });
      continue;
    }

    // Default: action
    parsed.push({ type: 'action', text: trimmed });
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Helper: compute default scene selection
// ---------------------------------------------------------------------------

function getDefaultSceneIndex(
  scenesData: { sceneNumber: number }[],
  currentSceneNumber: number,
  stageNumber: number
): number {
  if (scenesData.length === 0) return 0;

  if (stageNumber >= 7) {
    // Pick the most recent prior scene (scene N-1), fall back to nearest prior, then first available
    const priorScenes = scenesData
      .map((s, i) => ({ ...s, idx: i }))
      .filter(s => s.sceneNumber < currentSceneNumber)
      .sort((a, b) => b.sceneNumber - a.sceneNumber);

    if (priorScenes.length > 0) return priorScenes[0].idx;
  }

  // Stage 6 or no prior scenes: first available
  return 0;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabBar({
  tabs,
  activeIndex,
  onTabClick,
}: {
  tabs: TabDef[];
  activeIndex: number;
  onTabClick: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {tabs.map((tab, idx) => {
        const Icon = tab.icon;
        const isActive = idx === activeIndex;
        return (
          <button
            key={tab.id}
            onClick={() => onTabClick(idx)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function SceneTabBar({
  scenes,
  activeSceneId,
  onSceneClick,
}: {
  scenes: { sceneId: string; sceneNumber: number }[];
  activeSceneId: string;
  onSceneClick: (sceneId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto border-b border-border/20 scrollbar-thin"
    >
      {scenes.map((scene) => {
        const isActive = scene.sceneId === activeSceneId;
        return (
          <button
            key={scene.sceneId}
            onClick={() => onSceneClick(scene.sceneId)}
            className={cn(
              'shrink-0 px-2.5 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50'
            )}
          >
            Scene {scene.sceneNumber}
          </button>
        );
      })}
    </div>
  );
}

function ScriptExcerptContent({ scriptExcerpt }: { scriptExcerpt?: string }) {
  if (!scriptExcerpt) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No script excerpt available for this scene.
      </div>
    );
  }

  const lines = parseScriptLines(scriptExcerpt);

  return (
    <ScrollArea className="h-full">
      <div
        className="px-4 py-3 space-y-0.5"
        style={{ fontFamily: "'Courier Prime', 'Courier New', monospace" }}
      >
        {lines.map((line, i) => {
          if (line.type === 'empty') {
            return <div key={i} className="h-2" />;
          }

          const styles: Record<ScriptLineType, string> = {
            heading: 'font-bold uppercase text-amber-400 mt-3 mb-0.5 text-xs',
            action: 'text-foreground text-xs leading-relaxed mb-0.5',
            character: 'text-blue-300 font-bold uppercase ml-16 mt-2 text-xs',
            parenthetical: 'text-gray-400 italic ml-16 text-xs',
            dialogue: 'text-foreground ml-10 text-xs leading-relaxed',
            transition: 'uppercase text-amber-400 text-right mt-3 mb-3 text-xs',
            empty: '',
          };

          return (
            <p key={i} className={styles[line.type]}>
              {line.text}
            </p>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// StillsContent
// ---------------------------------------------------------------------------

function StillCard({
  shotId,
  imageUrl,
  onEnlarge,
}: {
  shotId: string;
  imageUrl: string;
  onEnlarge: () => void;
}) {
  const [loadError, setLoadError] = useState(false);

  return (
    <div className="shrink-0 flex flex-col items-center gap-1">
      <button
        onClick={onEnlarge}
        className="relative group rounded-md overflow-hidden border border-border/50 hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {loadError ? (
          <div className="w-32 h-20 bg-muted/50 flex items-center justify-center">
            <Image className="w-5 h-5 text-muted-foreground/50" />
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={`Shot ${shotId} start frame`}
            className="w-32 h-20 object-cover"
            loading="lazy"
            onError={() => setLoadError(true)}
          />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </button>
      <span className="text-xs font-mono text-muted-foreground">{shotId}</span>
    </div>
  );
}

function LightboxModal({
  imageUrl,
  shotId,
  onClose,
}: {
  imageUrl: string;
  shotId: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-background/90 text-foreground hover:bg-background transition-colors border border-border/50"
        >
          <X className="w-4 h-4" />
        </button>
        <img
          src={imageUrl}
          alt={`Shot ${shotId} full resolution`}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
        <p className="text-center text-xs font-mono text-muted-foreground mt-2">
          Shot {shotId}
        </p>
      </div>
    </div>
  );
}

function HorizontalScrollCarousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  return (
    <div className="relative flex-1 min-h-0">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex items-start gap-3 px-4 py-3 overflow-x-auto scrollbar-thin h-full"
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function StillsContent({
  allStills,
  isLoading,
  currentSceneNumber,
  stageNumber,
}: {
  allStills: SceneStillsData[];
  isLoading: boolean;
  currentSceneNumber: number;
  stageNumber: number;
}) {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ imageUrl: string; shotId: string } | null>(null);

  // Auto-select default scene
  useEffect(() => {
    if (allStills.length === 0) {
      setActiveSceneId(null);
      return;
    }
    // If current selection is still valid, keep it
    if (activeSceneId && allStills.some(s => s.sceneId === activeSceneId)) return;

    const defaultIdx = getDefaultSceneIndex(allStills, currentSceneNumber, stageNumber);
    setActiveSceneId(allStills[defaultIdx]?.sceneId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStills, currentSceneNumber, stageNumber]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
        Loading stills...
      </div>
    );
  }

  if (allStills.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground px-4 text-center">
        No stills available yet. Start frames are generated in Stage 10.
      </div>
    );
  }

  const activeScene = allStills.find(s => s.sceneId === activeSceneId) ?? allStills[0];

  return (
    <div className="h-full flex flex-col">
      <SceneTabBar
        scenes={allStills.map(s => ({ sceneId: s.sceneId, sceneNumber: s.sceneNumber }))}
        activeSceneId={activeScene.sceneId}
        onSceneClick={setActiveSceneId}
      />
      <HorizontalScrollCarousel>
        {activeScene.stills.map((still) => (
          <StillCard
            key={still.shotId}
            shotId={still.shotId}
            imageUrl={still.imageUrl}
            onEnlarge={() => setLightboxImage({ imageUrl: still.imageUrl, shotId: still.shotId })}
          />
        ))}
      </HorizontalScrollCarousel>
      {lightboxImage && (
        <LightboxModal
          imageUrl={lightboxImage.imageUrl}
          shotId={lightboxImage.shotId}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClipsContent
// ---------------------------------------------------------------------------

function ClipCard({
  shotId,
  videoUrl,
  startFrameUrl,
  duration,
}: {
  shotId: string;
  videoUrl: string;
  startFrameUrl: string;
  duration: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [thumbError, setThumbError] = useState(false);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (isPlaying && videoRef.current) {
      videoRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [isPlaying]);

  return (
    <div className="shrink-0 flex flex-col items-center gap-1">
      <div className="relative rounded-md overflow-hidden border border-border/50 w-32 h-20">
        {isPlaying ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            controls
            onEnded={handleEnded}
            onPause={() => {
              if (videoRef.current && videoRef.current.ended) {
                setIsPlaying(false);
              }
            }}
          />
        ) : (
          <button
            onClick={handlePlay}
            className="relative group w-full h-full focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {thumbError ? (
              <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                <Film className="w-5 h-5 text-muted-foreground/50" />
              </div>
            ) : (
              <img
                src={startFrameUrl}
                alt={`Shot ${shotId} clip thumbnail`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setThumbError(true)}
              />
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-white ml-0.5" />
              </div>
            </div>
            {/* Duration badge */}
            <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/70 text-white px-1 rounded">
              {duration}s
            </span>
          </button>
        )}
      </div>
      <span className="text-xs font-mono text-muted-foreground">{shotId}</span>
    </div>
  );
}

function ClipsContent({
  allClips,
  isLoading,
  currentSceneNumber,
  stageNumber,
}: {
  allClips: SceneClipsData[];
  isLoading: boolean;
  currentSceneNumber: number;
  stageNumber: number;
}) {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  // Auto-select default scene
  useEffect(() => {
    if (allClips.length === 0) {
      setActiveSceneId(null);
      return;
    }
    if (activeSceneId && allClips.some(s => s.sceneId === activeSceneId)) return;

    const defaultIdx = getDefaultSceneIndex(allClips, currentSceneNumber, stageNumber);
    setActiveSceneId(allClips[defaultIdx]?.sceneId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClips, currentSceneNumber, stageNumber]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
        Loading clips...
      </div>
    );
  }

  if (allClips.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground px-4 text-center">
        No clips available yet. Videos are generated in Stage 12.
      </div>
    );
  }

  const activeScene = allClips.find(s => s.sceneId === activeSceneId) ?? allClips[0];

  return (
    <div className="h-full flex flex-col">
      <SceneTabBar
        scenes={allClips.map(s => ({ sceneId: s.sceneId, sceneNumber: s.sceneNumber }))}
        activeSceneId={activeScene.sceneId}
        onSceneClick={setActiveSceneId}
      />
      <HorizontalScrollCarousel>
        {activeScene.clips.map((clip) => (
          <ClipCard
            key={clip.shotId}
            shotId={clip.shotId}
            videoUrl={clip.videoUrl}
            startFrameUrl={clip.startFrameUrl}
            duration={clip.duration}
          />
        ))}
      </HorizontalScrollCarousel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shot list (unchanged)
// ---------------------------------------------------------------------------

function ShotCard({ shot }: { shot: Shot }) {
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs font-mono">
          {shot.shotId}
        </Badge>
        <Badge variant="outline" className="text-[10px] gap-1">
          <Camera className="w-3 h-3" />
          {shot.camera}
        </Badge>
        <Badge variant="outline" className="text-[10px] gap-1">
          <Clock className="w-3 h-3" />
          {shot.duration}s
        </Badge>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{shot.action}</p>
      {shot.dialogue && (
        <p className="text-xs text-muted-foreground italic">
          &ldquo;{shot.dialogue.length > 80 ? `${shot.dialogue.substring(0, 80)}...` : shot.dialogue}&rdquo;
        </p>
      )}
    </div>
  );
}

function ShotListContent({ shots }: { shots: Shot[] }) {
  if (shots.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No shots extracted yet. Complete Stage 7 to see the shot list.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground border-b border-border/30">
        <span>{shots.length} shot{shots.length !== 1 ? 's' : ''}</span>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="divide-y divide-border/30">
          {shots.map((shot) => (
            <ShotCard key={shot.id} shot={shot} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resize handle
// ---------------------------------------------------------------------------

function ResizeHandle({
  onDragStart,
  isDragging,
  onDoubleClick,
}: {
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  isDragging: boolean;
  onDoubleClick?: () => void;
}) {
  return (
    <div
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
      onDoubleClick={onDoubleClick}
      className={cn(
        'h-3 cursor-row-resize flex items-center justify-center border-t border-border/30',
        'hover:bg-border/30 transition-colors select-none',
        isDragging && 'bg-primary/10'
      )}
    >
      <GripHorizontal className="w-4 h-3 text-muted-foreground/50" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ContentAccessCarousel({
  projectId,
  sceneId,
  stageNumber,
  sceneNumber: sceneNumberProp,
}: ContentAccessCarouselProps) {
  // Panel state
  const [isExpanded, setIsExpanded] = useState(true);
  const [panelHeight, setPanelHeight] = useState(
    () => sessionPanelHeight ?? window.innerHeight * DEFAULT_HEIGHT_RATIO
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // ---------------------------------------------------------------------------
  // Data fetching (must precede tab/carousel state for initializer access)
  // ---------------------------------------------------------------------------

  const { data: scenes } = useQuery({
    queryKey: ['scenes', projectId],
    queryFn: () => sceneService.fetchScenes(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const currentSceneIndex = useMemo(
    () => scenes?.findIndex(s => s.id === sceneId) ?? -1,
    [scenes, sceneId]
  );
  const currentScene = currentSceneIndex >= 0 ? scenes![currentSceneIndex] : null;

  const derivedSceneNumber = sceneNumberProp ?? currentScene?.sceneNumber ?? 0;

  const { data: shots = [] } = useQuery({
    queryKey: ['shots', projectId, sceneId],
    queryFn: () => shotService.fetchShots(projectId, sceneId),
    enabled: !!projectId && !!sceneId && stageNumber >= 8,
    staleTime: 60_000,
  });

  // ---------------------------------------------------------------------------
  // Tab availability (must precede carousel state for initializer access)
  // ---------------------------------------------------------------------------

  const availableTabs = useMemo<TabDef[]>(() => {
    const tabs: TabDef[] = [];

    // Script: always available (stages 6-12)
    tabs.push({ id: 'script', label: 'Script', icon: FileText });

    // Stills: always available (stages 6-12)
    tabs.push({ id: 'stills', label: 'Stills', icon: Image });

    // Clips: always available (stages 6-12)
    tabs.push({ id: 'clips', label: 'Clips', icon: Film });

    // Shots: stages 8-12 only
    if (stageNumber >= 8) {
      tabs.push({ id: 'shots', label: 'Shots', icon: Clapperboard });
    }

    return tabs;
  }, [stageNumber]);

  // ---------------------------------------------------------------------------
  // Carousel state (initialized from session-persisted tab)
  // ---------------------------------------------------------------------------

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeTabIndex, setActiveTabIndex] = useState(() => {
    if (sessionActiveTabId) {
      const idx = availableTabs.findIndex(t => t.id === sessionActiveTabId);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  const activeTabId = availableTabs[activeTabIndex]?.id ?? 'script';

  // Sync carousel position → active tab
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setActiveTabIndex(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  // Scroll carousel to preserved tab on re-mount (after collapse/expand)
  useEffect(() => {
    if (carouselApi && activeTabIndex > 0) {
      requestAnimationFrame(() => {
        carouselApi.scrollTo(activeTabIndex, true); // instant, no animation
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselApi]);

  // Persist active tab to module-level variable
  useEffect(() => {
    sessionActiveTabId = availableTabs[activeTabIndex]?.id ?? null;
  }, [activeTabIndex, availableTabs]);

  // Reset active tab when available tabs change
  useEffect(() => {
    if (activeTabIndex >= availableTabs.length) {
      setActiveTabIndex(0);
      carouselApi?.scrollTo(0);
    }
  }, [availableTabs.length, activeTabIndex, carouselApi]);

  // ---------------------------------------------------------------------------
  // Lazy-loaded stills & clips data
  // ---------------------------------------------------------------------------

  const scenesForFetch = useMemo(
    () => (scenes ?? []).map(s => ({ id: s.id, sceneNumber: s.sceneNumber })),
    [scenes]
  );

  const { data: allStills = [], isLoading: stillsLoading } = useQuery({
    queryKey: ['all-start-frames', projectId, sceneId],
    queryFn: () => fetchAllStartFrames(projectId, sceneId, scenesForFetch),
    enabled: !!projectId && !!sceneId && activeTabId === 'stills' && scenesForFetch.length > 0,
    staleTime: 120_000,
  });

  const { data: allClips = [], isLoading: clipsLoading } = useQuery({
    queryKey: ['all-completed-clips', projectId, sceneId],
    queryFn: () => fetchAllCompletedClips(projectId, sceneId, scenesForFetch),
    enabled: !!projectId && !!sceneId && activeTabId === 'clips' && scenesForFetch.length > 0,
    staleTime: 120_000,
  });

  // ---------------------------------------------------------------------------
  // Drag-to-resize
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      dragStartY.current = clientY;
      dragStartHeight.current = panelHeight;
      setIsDragging(true);
    },
    [panelHeight]
  );

  useEffect(() => {
    if (!isDragging) return;

    const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const delta = clientY - dragStartY.current;
      const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, dragStartHeight.current + delta));
      setPanelHeight(newHeight);
      sessionPanelHeight = newHeight;
    };

    const handleEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  // ---------------------------------------------------------------------------
  // Tab click handler
  // ---------------------------------------------------------------------------

  const handleTabClick = useCallback(
    (index: number) => {
      setActiveTabIndex(index);
      carouselApi?.scrollTo(index);
    },
    [carouselApi]
  );

  // Double-click resize handle → reset to default height
  const handleResetHeight = useCallback(() => {
    const defaultHeight = window.innerHeight * DEFAULT_HEIGHT_RATIO;
    setPanelHeight(defaultHeight);
    sessionPanelHeight = defaultHeight;
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (availableTabs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-border/50 bg-card/30 backdrop-blur-sm"
    >
      {/* Header bar — always visible */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground select-none">Content Access</span>
          {isExpanded && (
            <TabBar tabs={availableTabs} activeIndex={activeTabIndex} onTabClick={handleTabClick} />
          )}
        </div>
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible content area */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: panelHeight }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: isDragging ? 0 : 0.2, ease: 'easeInOut' }}
            className="overflow-hidden flex flex-col"
          >
            <div className="flex-1 min-h-0">
              <Carousel
                orientation="horizontal"
                opts={{ watchDrag: false }}
                setApi={setCarouselApi}
                className="h-full [&>div]:h-full"
              >
                <CarouselContent className="h-full">
                  {availableTabs.map((tab) => (
                    <CarouselItem key={tab.id} className="h-full">
                      {tab.id === 'script' && (
                        <ScriptExcerptContent scriptExcerpt={currentScene?.scriptExcerpt} />
                      )}
                      {tab.id === 'stills' && (
                        <StillsContent
                          allStills={allStills}
                          isLoading={stillsLoading && activeTabId === 'stills'}
                          currentSceneNumber={derivedSceneNumber}
                          stageNumber={stageNumber}
                        />
                      )}
                      {tab.id === 'clips' && (
                        <ClipsContent
                          allClips={allClips}
                          isLoading={clipsLoading && activeTabId === 'clips'}
                          currentSceneNumber={derivedSceneNumber}
                          stageNumber={stageNumber}
                        />
                      )}
                      {tab.id === 'shots' && (
                        <ShotListContent shots={shots} />
                      )}
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>

            {/* Resize handle */}
            <ResizeHandle onDragStart={handleDragStart} isDragging={isDragging} onDoubleClick={handleResetHeight} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
