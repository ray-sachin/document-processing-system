'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, FileText, FileType, FileImage, File, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface UploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  isUploading: boolean;
  maxFiles?: number;
  acceptedTypes?: string[];
}

function getFileIconComponent(fileType: string) {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />;
    case 'docx':
    case 'doc':
      return <FileType className="h-5 w-5 text-blue-500" />;
    case 'txt':
      return <FileText className="h-5 w-5 text-gray-500" />;
    case 'csv':
      return <FileType className="h-5 w-5 text-green-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'bmp':
    case 'tif':
    case 'tiff':
      return <FileImage className="h-5 w-5 text-amber-600" />;
    default:
      return <File className="h-5 w-5 text-gray-500" />;
  }
}

export function UploadZone({
  onUpload,
  isUploading,
  maxFiles = 10,
}: UploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const totalFileSize = files.reduce((total, file) => total + file.size, 0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles].slice(0, maxFiles));
  }, [maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/bmp': ['.bmp'],
      'image/tiff': ['.tif', '.tiff'],
    },
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    try {
      await onUpload(files);
      setFiles([]);
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={cn(
          'relative cursor-pointer overflow-hidden rounded-[28px] border-2 border-dashed p-10 text-center transition-all duration-200',
          isDragActive
            ? 'scale-[1.01] border-primary bg-primary/5'
            : 'border-muted-foreground/25 bg-muted/[0.22] hover:border-primary/50 hover:bg-muted/40',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} data-testid="file-input" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'flex h-16 w-16 items-center justify-center rounded-[22px] transition-colors',
            isDragActive ? 'bg-primary text-primary-foreground' : 'bg-background text-primary shadow-sm'
          )}>
            <Upload className="h-8 w-8" />
          </div>
          
          {isDragActive ? (
            <div>
              <p className="text-xl font-semibold text-primary">Drop files here</p>
              <p className="mt-1 text-sm text-muted-foreground">Release to add files to the batch</p>
            </div>
          ) : (
            <div>
              <p className="text-xl font-semibold">Drag & drop files here</p>
              <p className="mt-1 text-sm text-muted-foreground">
                or click to browse your computer
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {['PDF', 'DOCX', 'TXT', 'CSV', 'PNG', 'JPG', 'WEBP', 'TIFF'].map((type) => (
                  <span key={type} className="rounded-full border border-border/70 bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm">
                    {type}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Maximum {maxFiles} files at a time • Up to 50MB per file
              </p>
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <Card className="rounded-[24px] border-border/80 bg-background/95 p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatFileSize(totalFileSize)} total • ready for background processing
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles([])}
              disabled={isUploading}
              className="self-start rounded-full px-4 text-muted-foreground hover:text-destructive"
            >
              Clear all
            </Button>
          </div>
          
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="group flex items-center justify-between rounded-[20px] border border-border/60 bg-muted/35 p-3 transition-colors hover:bg-muted/55"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="rounded-2xl bg-background p-2 shadow-sm">
                    {getFileIconComponent(file.name.split('.').pop() || '')}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                  className="h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {isUploading && uploadProgress > 0 && (
            <div className="mt-5 space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="mt-5 h-11 w-full rounded-full"
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length} file{files.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </Card>
      )}
    </div>
  );
}
