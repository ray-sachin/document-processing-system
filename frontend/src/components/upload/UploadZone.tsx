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
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} data-testid="file-input" />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
            isDragActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <Upload className="h-8 w-8" />
          </div>
          
          {isDragActive ? (
            <div>
              <p className="text-xl font-semibold text-primary">Drop files here</p>
              <p className="text-sm text-muted-foreground mt-1">Release to add files</p>
            </div>
          ) : (
            <div>
              <p className="text-xl font-semibold">Drag & drop files here</p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse your computer
              </p>
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                {['PDF', 'DOCX', 'TXT', 'CSV', 'PNG', 'JPG'].map((type) => (
                  <span key={type} className="px-2 py-1 text-xs bg-muted rounded-md font-medium">
                    {type}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Maximum {maxFiles} files at a time • Up to 50MB per file
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles([])}
              disabled={isUploading}
              className="text-muted-foreground hover:text-destructive"
            >
              Clear all
            </Button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-background rounded-lg">
                    {getFileIconComponent(file.name.split('.').pop() || '')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
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
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {isUploading && uploadProgress > 0 && (
            <div className="mt-4 space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="w-full mt-4"
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
