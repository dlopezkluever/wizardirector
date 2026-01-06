import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  File, 
  FileText, 
  Image, 
  X, 
  AlertCircle,
  CheckCircle2,
  Star,
  StarOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  isPrimary: boolean;
  tag?: string;
  lastModified: number;
}

interface FileStagingAreaProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
}

const ACCEPTED_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/rtf',
  'application/rtf'
];

const TYPE_LABELS: Record<string, string> = {
  'text/plain': 'Text File',
  'text/markdown': 'Markdown',
  'application/pdf': 'PDF Document',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'text/rtf': 'Rich Text Format',
  'application/rtf': 'Rich Text Format'
};

const FILE_TAGS = [
  'Character Notes',
  'World Building', 
  'Parody Source',
  'Visual Reference',
  'Research Notes',
  'Style Guide',
  'Other'
];

export function FileStagingArea({ 
  files, 
  onFilesChange, 
  maxFiles = 10,
  acceptedTypes = ACCEPTED_TYPES,
  maxFileSize = 10 // 10MB default
}: FileStagingAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type "${file.type}" is not supported. Please upload text, PDF, or document files.`;
    }

    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit.`;
    }

    return null;
  }, [acceptedTypes, maxFileSize]);

  const readFileContent = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.type === 'application/pdf') {
        // For PDFs, we'll need to handle text extraction differently
        // For now, just store the file info without content
        resolve('');
      } else {
        reader.readAsText(file);
      }
    });
  }, []);

  const processFiles = useCallback(async (fileList: FileList) => {
    if (files.length + fileList.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsProcessing(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const validationError = validateFile(file);
        
        if (validationError) {
          toast.error(validationError);
          continue;
        }

        try {
          const content = await readFileContent(file);
          const uploadedFile: UploadedFile = {
            id: `file-${Date.now()}-${i}`,
            name: file.name,
            size: file.size,
            type: file.type,
            content,
            isPrimary: files.length === 0 && newFiles.length === 0, // First file is primary by default
            lastModified: file.lastModified
          };
          newFiles.push(uploadedFile);
        } catch (error) {
          console.error('Error reading file:', error);
          toast.error(`Failed to read file: ${file.name}`);
        }
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
        toast.success(`${newFiles.length} file(s) uploaded successfully`);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [files, maxFiles, validateFile, readFileContent, onFilesChange]);

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
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const removeFile = useCallback((fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    
    // If we removed the primary file, make the first remaining file primary
    if (updatedFiles.length > 0 && !updatedFiles.some(f => f.isPrimary)) {
      updatedFiles[0].isPrimary = true;
    }
    
    onFilesChange(updatedFiles);
    toast.success('File removed');
  }, [files, onFilesChange]);

  const setPrimaryFile = useCallback((fileId: string) => {
    const updatedFiles = files.map(f => ({
      ...f,
      isPrimary: f.id === fileId
    }));
    onFilesChange(updatedFiles);
  }, [files, onFilesChange]);

  const setFileTag = useCallback((fileId: string, tag: string) => {
    const updatedFiles = files.map(f => 
      f.id === fileId ? { ...f, tag } : f
    );
    onFilesChange(updatedFiles);
  }, [files, onFilesChange]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf')) return File;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
          isDragOver
            ? 'border-primary bg-primary/10 shadow-gold'
            : 'border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="space-y-4">
          <div className={cn(
            'mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors',
            isDragOver ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <Upload className="w-8 h-8" />
          </div>
          
          <div>
            <h3 className="font-medium text-foreground mb-2">
              {isDragOver ? 'Drop files here' : 'Upload Files'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported: Text, PDF, Word documents • Max {maxFileSize}MB per file • Up to {maxFiles} files
            </p>
          </div>
          
          {!isDragOver && (
            <Button 
              variant="outline" 
              size="sm"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
            >
              {isProcessing ? 'Processing...' : 'Choose Files'}
            </Button>
          )}
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">
                Uploaded Files ({files.length})
              </h4>
              {files.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  <Star className="w-3 h-3 inline mr-1" />
                  Primary input file
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.type);
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-all',
                      file.isPrimary 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-card border-border'
                    )}
                  >
                    {/* File Icon */}
                    <div className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-lg',
                      file.isPrimary ? 'bg-primary/20' : 'bg-secondary'
                    )}>
                      <FileIcon className="w-5 h-5" />
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {file.name}
                        </p>
                        {file.isPrimary && (
                          <Star className="w-4 h-4 text-primary fill-current" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{TYPE_LABELS[file.type] || file.type}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.size)}</span>
                        {file.tag && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                              {file.tag}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {!file.isPrimary && files.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPrimaryFile(file.id)}
                          title="Set as primary input"
                        >
                          <StarOff className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Tag Selector */}
                      {!file.isPrimary && (
                        <select
                          value={file.tag || ''}
                          onChange={(e) => setFileTag(file.id, e.target.value)}
                          className="text-xs bg-transparent border border-border rounded px-2 py-1 text-foreground"
                        >
                          <option value="">Tag...</option>
                          {FILE_TAGS.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFile(file.id)}
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Validation Messages */}
      {files.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          {files.some(f => f.isPrimary) ? (
            <div className="flex items-center gap-1 text-success">
              <CheckCircle2 className="w-3 h-3" />
              <span>Primary input file selected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-warning">
              <AlertCircle className="w-3 h-3" />
              <span>Please designate a primary input file</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}