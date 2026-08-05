import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  X,
  Star,
  StarOff,
  Loader2,
  AlertCircle,
  RefreshCw,
  ClipboardPaste,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { streamlineService, type StreamlineClassification, type StreamlineFileType } from '@/lib/services/streamlineService';

const TYPE_LABELS: Record<StreamlineFileType, string> = {
  script: 'Screenplay',
  treatment: 'Treatment',
  beat_sheet: 'Beat Sheet',
  character_notes: 'Character/Location Notes',
  unclassified: 'Unclassified',
};

const FORMATTABLE_TYPES: StreamlineFileType[] = ['treatment', 'beat_sheet'];

export interface StreamlineFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  isPrimary: boolean;
  status: 'pending' | 'extracting' | 'success' | 'error';
  text?: string;
  classification?: StreamlineClassification;
  error?: string;
  source: 'upload' | 'paste';
  /** User's manual type override (Task 3.1) — takes precedence over classification.type. */
  typeOverride?: StreamlineFileType;
  /** Per-file as-is vs AI-format choice (Task 3.1) — never a global toggle. Only meaningful for treatment/beat_sheet. */
  formatChoice?: 'as-is' | 'ai-format';
  /** Set once an AI-format pass (treatment target) has run. */
  formattedText?: string;
  /** Set once an AI-format pass (beat_sheet target) has run. */
  formattedBeats?: { beats: Array<{ id: string; order: number; text: string; rationale?: string; estimatedScreenTimeSeconds: number }>; totalEstimatedRuntime: number };
  isFormatting?: boolean;
  /** Standalone Stage 5 asset draft (Task 3.5) — populated server-side when classification.type === 'character_notes'. */
  assetDraft?: { name: string; type: 'character' | 'prop' | 'location'; description: string };
}

export type StreamlineFilesUpdater = StreamlineFile[] | ((prev: StreamlineFile[]) => StreamlineFile[]);

interface StreamlineDropZoneProps {
  projectId: string;
  files: StreamlineFile[];
  /** Accepts a plain array or an updater function — pass a React setState dispatch directly. Concurrent per-file extractions rely on the functional form to avoid clobbering each other's updates. */
  onFilesChange: (update: StreamlineFilesUpdater) => void;
  /** Fires once, each time every in-flight file settles (success or error) — Phase 4's Ask Auteur session waits on this before opening. */
  onBatchSettled?: () => void;
  maxFiles?: number;
  maxFileSizeMB?: number;
}

const ACCEPTED_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/rtf',
  'application/rtf',
];

const REJECTED_DOC_MESSAGE = 'Legacy .doc files are not supported — please save as .docx or .pdf.';

function isDocFile(file: File): boolean {
  return file.type === 'application/msword' || file.name.toLowerCase().endsWith('.doc');
}

function validateFile(file: File, maxFileSizeMB: number): string | null {
  if (isDocFile(file)) return REJECTED_DOC_MESSAGE;
  if (!ACCEPTED_TYPES.includes(file.type) && !/\.(txt|md|pdf|docx|rtf)$/i.test(file.name)) {
    return `File type "${file.type || 'unknown'}" is not supported. Supported: .txt, .md, .pdf, .docx, .rtf.`;
  }
  if (file.size > maxFileSizeMB * 1024 * 1024) {
    return `File size exceeds ${maxFileSizeMB}MB limit.`;
  }
  return null;
}

export function StreamlineDropZone({
  projectId,
  files,
  onFilesChange,
  onBatchSettled,
  maxFiles = 10,
  maxFileSizeMB = 20,
}: StreamlineDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasInFlight = files.some(f => f.status === 'pending' || f.status === 'extracting');
  const wasInFlight = useRef(false);

  // Batch-settled signal: fires once each time the batch transitions from
  // "something in flight" to "everything settled" — never before full-batch
  // extraction/classification completes (Phase 4's gating requirement).
  useEffect(() => {
    if (wasInFlight.current && !hasInFlight && files.length > 0) {
      onBatchSettled?.();
    }
    wasInFlight.current = hasInFlight;
  }, [hasInFlight, files.length, onBatchSettled]);

  // Functional updates throughout — concurrent per-file extractions resolve
  // in unpredictable order, so each update must be derived from whatever the
  // latest state turns out to be at apply time, not a snapshot read earlier.
  const extractOne = useCallback(async (streamlineFile: StreamlineFile, file: File) => {
    try {
      const result = await streamlineService.extractFile(projectId, file);
      // Default as-is/AI-format driven by confidence (Task 3.1) — high
      // confidence means the document already looks like what it claims to
      // be, so as-is is the sane default; lower confidence suggests it may
      // need restructuring. User can always override per-file.
      const defaultFormatChoice: StreamlineFile['formatChoice'] = result.classification.confidence >= 0.75 ? 'as-is' : 'ai-format';
      onFilesChange(prev =>
        prev.map(f =>
          f.id === streamlineFile.id
            ? {
                ...f,
                status: 'success' as const,
                text: result.text,
                classification: result.classification,
                assetDraft: result.assetDraft,
                formatChoice: defaultFormatChoice,
              }
            : f
        )
      );
    } catch (error) {
      onFilesChange(prev =>
        prev.map(f =>
          f.id === streamlineFile.id
            ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Extraction failed' }
            : f
        )
      );
    }
  }, [projectId, onFilesChange]);

  const processFiles = useCallback((fileList: FileList) => {
    if (files.length + fileList.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const accepted: { streamlineFile: StreamlineFile; file: File }[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validationError = validateFile(file, maxFileSizeMB);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        continue;
      }

      const streamlineFile: StreamlineFile = {
        id: `sf-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        isPrimary: files.length === 0 && accepted.length === 0,
        status: 'extracting',
        source: 'upload',
      };
      accepted.push({ streamlineFile, file });
    }

    if (accepted.length === 0) return;

    onFilesChange(prev => [...prev, ...accepted.map(a => a.streamlineFile)]);
    // Fire extraction independently per file — one failure never blocks the rest.
    for (const { streamlineFile, file } of accepted) {
      void extractOne(streamlineFile, file);
    }
  }, [files.length, maxFiles, maxFileSizeMB, onFilesChange, extractOne]);

  const retryFile = useCallback((streamlineFile: StreamlineFile) => {
    toast.error('Re-select the file to retry — browsers don\'t let us keep the original bytes around.');
    void streamlineFile;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processFiles]);

  const removeFile = useCallback((id: string) => {
    onFilesChange(prev => {
      const updated = prev.filter(f => f.id !== id);
      if (updated.length > 0 && !updated.some(f => f.isPrimary)) {
        updated[0] = { ...updated[0], isPrimary: true };
      }
      return updated;
    });
  }, [onFilesChange]);

  const setPrimary = useCallback((id: string) => {
    onFilesChange(prev => prev.map(f => ({ ...f, isPrimary: f.id === id })));
  }, [onFilesChange]);

  const setTypeOverride = useCallback((id: string, typeOverride: StreamlineFileType) => {
    onFilesChange(prev => prev.map(f => (f.id === id ? { ...f, typeOverride } : f)));
  }, [onFilesChange]);

  const runAiFormat = useCallback(async (file: StreamlineFile) => {
    const targetType = (file.typeOverride ?? file.classification?.type) as 'treatment' | 'beat_sheet';
    if (!file.text || !FORMATTABLE_TYPES.includes(targetType)) return;

    onFilesChange(prev => prev.map(f => (f.id === file.id ? { ...f, isFormatting: true } : f)));
    try {
      const result = await streamlineService.formatFile(projectId, file.text, targetType);
      onFilesChange(prev => prev.map(f => (f.id === file.id
        ? {
            ...f,
            isFormatting: false,
            formattedText: result.treatment,
            formattedBeats: result.beats ? { beats: result.beats, totalEstimatedRuntime: result.totalEstimatedRuntime ?? 0 } : undefined,
          }
        : f)));
    } catch (error) {
      onFilesChange(prev => prev.map(f => (f.id === file.id ? { ...f, isFormatting: false } : f)));
      toast.error(error instanceof Error ? error.message : `Failed to AI-format ${file.name}`);
    }
  }, [projectId, onFilesChange]);

  const setFormatChoice = useCallback((file: StreamlineFile, formatChoice: 'as-is' | 'ai-format') => {
    onFilesChange(prev => prev.map(f => (f.id === file.id ? { ...f, formatChoice } : f)));
    if (formatChoice === 'ai-format' && !file.formattedText && !file.formattedBeats) {
      void runAiFormat(file);
    }
  }, [onFilesChange, runAiFormat]);

  const addPastedText = useCallback(() => {
    if (pasteText.trim().length === 0) return;
    const streamlineFile: StreamlineFile = {
      id: `sf-paste-${Date.now()}`,
      name: `Pasted text ${files.filter(f => f.source === 'paste').length + 1}`,
      size: pasteText.length,
      mimeType: 'text/plain',
      isPrimary: files.length === 0,
      status: 'success',
      text: pasteText,
      classification: { type: 'unclassified', confidence: 0 },
      source: 'paste',
    };
    onFilesChange(prev => [...prev, streamlineFile]);
    setPasteText('');
    setShowPasteInput(false);
  }, [pasteText, files, onFilesChange]);

  return (
    <div className="space-y-4">
      <div
        data-testid="streamline-dropzone"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
          isDragOver ? 'border-primary bg-primary/10 shadow-gold' : 'border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.pdf,.docx,.rtf,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/rtf,application/rtf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-3">
          <div className={cn('mx-auto w-14 h-14 rounded-full flex items-center justify-center', isDragOver ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">{isDragOver ? 'Drop files here' : 'Drop whatever you have'}</h3>
            <p className="text-xs text-muted-foreground">Script, treatment, notes, character sketches — .txt, .md, .pdf, .docx, .rtf • Max {maxFileSizeMB}MB • Up to {maxFiles} files</p>
          </div>
          {!isDragOver && (
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Choose Files</Button>
          )}
        </div>
      </div>

      <div>
        {!showPasteInput ? (
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowPasteInput(true)}>
            <ClipboardPaste className="w-4 h-4" />
            Or paste text instead
          </Button>
        ) : (
          <div className="space-y-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste script or notes here..."
              className="w-full h-32 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={addPastedText} disabled={pasteText.trim().length === 0}>Add as file</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowPasteInput(false); setPasteText(''); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {files.map((f) => {
              const currentType = f.typeOverride ?? f.classification?.type;
              const isFormattable = currentType && FORMATTABLE_TYPES.includes(currentType);

              return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn('flex flex-col gap-2 p-3 rounded-lg border', f.isPrimary ? 'bg-primary/10 border-primary/30' : 'bg-card border-border')}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', f.isPrimary ? 'bg-primary/20' : 'bg-secondary')}>
                    {f.status === 'extracting' || f.status === 'pending' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : f.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate text-sm">{f.name}</p>
                      {f.isPrimary && <Star className="w-3.5 h-3.5 text-primary fill-current shrink-0" />}
                    </div>
                    {f.status === 'error' ? (
                      <p className="text-xs text-destructive">{f.error}</p>
                    ) : f.status === 'extracting' || f.status === 'pending' ? (
                      <p className="text-xs text-muted-foreground">Extracting…</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {f.classification && f.classification.confidence > 0
                          ? `${Math.round(f.classification.confidence * 100)}% confident: ${TYPE_LABELS[f.classification.type]}`
                          : 'Unclassified — is this right?'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {f.status === 'error' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => retryFile(f)} title="Retry">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    {!f.isPrimary && f.status === 'success' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPrimary(f.id)} title="Set as primary">
                        <StarOff className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeFile(f.id)} title="Remove">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {f.status === 'success' && (
                  <div className="flex flex-wrap items-center gap-2 pl-12 text-xs">
                    <label className="text-muted-foreground">Type:</label>
                    <select
                      value={currentType ?? 'unclassified'}
                      onChange={(e) => setTypeOverride(f.id, e.target.value as StreamlineFileType)}
                      className="bg-transparent border border-border rounded px-2 py-1 text-foreground"
                    >
                      {(Object.keys(TYPE_LABELS) as StreamlineFileType[]).map(t => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>

                    {isFormattable && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant={f.formatChoice === 'as-is' ? 'stage-active' : 'stage'}
                          className="h-6 px-2 text-xs"
                          onClick={() => setFormatChoice(f, 'as-is')}
                        >
                          As-is
                        </Button>
                        <Button
                          size="sm"
                          variant={f.formatChoice === 'ai-format' ? 'stage-active' : 'stage'}
                          className="h-6 px-2 text-xs"
                          disabled={f.isFormatting}
                          onClick={() => setFormatChoice(f, 'ai-format')}
                        >
                          {f.isFormatting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'AI-format'}
                        </Button>
                      </div>
                    )}

                    {f.assetDraft && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                        Draft: {f.assetDraft.name} ({f.assetDraft.type})
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
