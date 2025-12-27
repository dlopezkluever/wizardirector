import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  File, 
  FileText, 
  X, 
  Star, 
  Tag,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  isPrimary: boolean;
  contextTag?: string;
}

const contextTags = [
  'Character Notes',
  'World Building',
  'Reference Material',
  'Parody Source',
  'Visual Reference',
  'Dialogue Samples',
  'Research Notes',
  'Formatting Guide',
];

interface FileStagingAreaProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

export function FileStagingArea({ 
  files, 
  onFilesChange,
  maxFiles = 10 
}: FileStagingAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles: UploadedFile[] = droppedFiles.slice(0, maxFiles - files.length).map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      isPrimary: files.length === 0 && index === 0,
    }));
    
    onFilesChange([...files, ...newFiles]);
  }, [files, maxFiles, onFilesChange]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files);
    const newFiles: UploadedFile[] = selectedFiles.slice(0, maxFiles - files.length).map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      isPrimary: files.length === 0 && index === 0,
    }));
    
    onFilesChange([...files, ...newFiles]);
    e.target.value = '';
  }, [files, maxFiles, onFilesChange]);

  const setPrimaryFile = useCallback((fileId: string) => {
    onFilesChange(files.map(f => ({
      ...f,
      isPrimary: f.id === fileId,
    })));
  }, [files, onFilesChange]);

  const setContextTag = useCallback((fileId: string, tag: string) => {
    onFilesChange(files.map(f => 
      f.id === fileId ? { ...f, contextTag: tag } : f
    ));
  }, [files, onFilesChange]);

  const removeFile = useCallback((fileId: string) => {
    const newFiles = files.filter(f => f.id !== fileId);
    // If we removed the primary file, make the first remaining file primary
    if (newFiles.length > 0 && !newFiles.some(f => f.isPrimary)) {
      newFiles[0].isPrimary = true;
    }
    onFilesChange(newFiles);
  }, [files, onFilesChange]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-200',
          isDragOver
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card/50 hover:border-primary/30 hover:bg-card/80'
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".txt,.md,.doc,.docx,.pdf,.rtf,.json"
        />
        <Upload className={cn(
          'w-10 h-10 mb-3 transition-colors',
          isDragOver ? 'text-primary' : 'text-muted-foreground'
        )} />
        <p className="text-foreground font-medium mb-1">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-muted-foreground">
          Supports TXT, MD, DOC, DOCX, PDF, RTF, JSON
        </p>
      </div>

      {/* File List */}
      <AnimatePresence mode="popLayout">
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {files.length} file{files.length !== 1 ? 's' : ''} staged
              </span>
              <span className="text-xs text-muted-foreground">
                Click <Star className="w-3 h-3 inline text-primary" /> to set primary input
              </span>
            </div>

            {files.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all',
                  file.isPrimary
                    ? 'bg-primary/10 border-primary/50'
                    : 'bg-card border-border'
                )}
              >
                {/* File Icon */}
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                  file.isPrimary ? 'bg-primary/20' : 'bg-secondary'
                )}>
                  <FileText className={cn(
                    'w-5 h-5',
                    file.isPrimary ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    {file.isPrimary && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-primary text-primary-foreground">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Context Tag Selector (for non-primary files) */}
                {!file.isPrimary && (
                  <Select
                    value={file.contextTag || ''}
                    onValueChange={(value) => setContextTag(file.id, value)}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Add tag..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contextTags.map((tag) => (
                        <SelectItem key={tag} value={tag} className="text-xs">
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!file.isPrimary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPrimaryFile(file.id)}
                      title="Set as primary input"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
