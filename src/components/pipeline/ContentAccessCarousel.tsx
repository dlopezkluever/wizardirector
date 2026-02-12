/**
 * Content Access Carousel (4WT-1)
 * Multi-tab collapsible, resizable panel providing access to:
 *   Tab 1 — Rearview Mirror (prior scene end state / end frame)
 *   Tab 2 — Script Excerpt (current scene's script in simplified screenplay format)
 *   Tab 3 — Shot List (vertical carousel of shot cards, stages 8-12 only)
 *
 * Replaces the old RearviewMirror component.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  FileText,
  Clapperboard,
  ChevronUp,
  ChevronDown,
  Camera,
  Clock,
  GripHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel';
import { sceneService } from '@/lib/services/sceneService';
import { shotService } from '@/lib/services/shotService';
import { cn } from '@/lib/utils';
import type { Shot } from '@/types/scene';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'rearview' | 'script' | 'shots';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
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

// Module-level session-persistent height (survives re-renders/navigation, resets on page reload)
let sessionPanelHeight: number | null = null;

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

function RearviewContent({
  priorSceneEndState,
  endFrameThumbnail,
  priorSceneName,
}: {
  priorSceneEndState?: string;
  endFrameThumbnail?: string;
  priorSceneName?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!endFrameThumbnail);

  useEffect(() => {
    if (endFrameThumbnail) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [endFrameThumbnail]);

  const showVisual = endFrameThumbnail && !imageError;

  if (!priorSceneEndState && !endFrameThumbnail) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No prior scene data available.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="px-4 py-3">
        {priorSceneName && (
          <p className="text-xs text-muted-foreground mb-2">
            Previous: {priorSceneName}
          </p>
        )}

        {showVisual ? (
          <div className="flex gap-4 items-start">
            <div className="relative group shrink-0">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg min-w-[12rem] min-h-[7rem]">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <img
                src={endFrameThumbnail}
                alt={priorSceneName ? `Final frame from ${priorSceneName}` : 'Final frame from previous scene'}
                className="w-48 h-28 object-cover rounded-lg border border-border/50"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground mb-1">
                Final Frame Reference
              </h4>
              <p className="text-xs text-muted-foreground">
                Use this as your visual anchor for continuity.
              </p>
              {priorSceneEndState && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {priorSceneEndState}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-background/50 rounded-lg p-4 border border-border/30">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {priorSceneEndState}
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
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
  const [innerApi, setInnerApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!innerApi) return;
    const onSelect = () => setCurrentIndex(innerApi.selectedScrollSnap());
    innerApi.on('select', onSelect);
    return () => { innerApi.off('select', onSelect); };
  }, [innerApi]);

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
        {shots.length > 1 && (
          <span>{currentIndex + 1} / {shots.length}</span>
        )}
      </div>
      <div className="flex-1 relative min-h-0">
        <Carousel
          orientation="vertical"
          className="h-full"
          setApi={setInnerApi}
        >
          <CarouselContent className="h-full">
            {shots.map((shot) => (
              <CarouselItem key={shot.id} className="basis-full">
                <ScrollArea className="h-full">
                  <ShotCard shot={shot} />
                </ScrollArea>
              </CarouselItem>
            ))}
          </CarouselContent>
          {shots.length > 1 && (
            <>
              <CarouselPrevious
                className="absolute -top-0 right-2 h-6 w-6 rounded-full"
                variant="ghost"
                size="icon"
              />
              <CarouselNext
                className="absolute -bottom-0 right-2 h-6 w-6 rounded-full"
                variant="ghost"
                size="icon"
              />
            </>
          )}
        </Carousel>
      </div>
    </div>
  );
}

function ResizeHandle({
  onDragStart,
  isDragging,
}: {
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  isDragging: boolean;
}) {
  return (
    <div
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
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

  // Carousel state
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Sync carousel position → active tab
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setActiveTabIndex(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  // ---------------------------------------------------------------------------
  // Data fetching
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
  const priorScene = currentSceneIndex > 0 ? scenes![currentSceneIndex - 1] : null;

  const derivedSceneNumber = sceneNumberProp ?? currentScene?.sceneNumber ?? 0;

  const { data: shots = [] } = useQuery({
    queryKey: ['shots', projectId, sceneId],
    queryFn: () => shotService.fetchShots(projectId, sceneId),
    enabled: !!projectId && !!sceneId && stageNumber >= 8,
    staleTime: 60_000,
  });

  // ---------------------------------------------------------------------------
  // Tab availability
  // ---------------------------------------------------------------------------

  const availableTabs = useMemo<TabDef[]>(() => {
    const tabs: TabDef[] = [];

    // Rearview: stages 6-12, hidden for scene 1
    if (derivedSceneNumber > 1) {
      tabs.push({ id: 'rearview', label: 'Rearview', icon: Eye });
    }

    // Script: always available (stages 6-12)
    tabs.push({ id: 'script', label: 'Script', icon: FileText });

    // Shots: stages 8-12 only
    if (stageNumber >= 8) {
      tabs.push({ id: 'shots', label: 'Shots', icon: Clapperboard });
    }

    return tabs;
  }, [stageNumber, derivedSceneNumber]);

  // Reset active tab when available tabs change
  useEffect(() => {
    if (activeTabIndex >= availableTabs.length) {
      setActiveTabIndex(0);
      carouselApi?.scrollTo(0);
    }
  }, [availableTabs.length, activeTabIndex, carouselApi]);

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
      {/* Tab bar + collapse toggle — always visible */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <TabBar tabs={availableTabs} activeIndex={activeTabIndex} onTabClick={handleTabClick} />
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
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden flex flex-col"
          >
            <div className="flex-1 min-h-0">
              <Carousel
                orientation="horizontal"
                opts={{ watchDrag: false }}
                setApi={setCarouselApi}
                className="h-full"
              >
                <CarouselContent className="h-full">
                  {availableTabs.map((tab) => (
                    <CarouselItem key={tab.id} className="h-full">
                      {tab.id === 'rearview' && (
                        <RearviewContent
                          priorSceneEndState={priorScene?.priorSceneEndState}
                          endFrameThumbnail={priorScene?.endFrameThumbnail}
                          priorSceneName={priorScene ? `Scene ${priorScene.sceneNumber}` : undefined}
                        />
                      )}
                      {tab.id === 'script' && (
                        <ScriptExcerptContent scriptExcerpt={currentScene?.scriptExcerpt} />
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
            <ResizeHandle onDragStart={handleDragStart} isDragging={isDragging} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
