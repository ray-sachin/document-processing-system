'use client';

import Link from 'next/link';
import { Document, JOB_STATUS_LABELS } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Trash2, 
  Eye, 
  RefreshCw,
  Clock,
  FileText,
  FileType,
  FileImage,
  File,
  MoreVertical
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PROCESSING_STAGES } from '@/types';

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  onRetry?: (jobId: string) => void;
  isDeleting?: boolean;
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

function getStatusStyles(status: string | null | undefined) {
  switch (status) {
    case 'queued':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
        bar: 'bg-yellow-500'
      };
    case 'processing':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        bar: 'bg-blue-500'
      };
    case 'completed':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        bar: 'bg-green-500'
      };
    case 'failed':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
        bar: 'bg-red-500'
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-700',
        bar: 'bg-gray-400'
      };
  }
}

export function DocumentCard({ 
  document, 
  onDelete, 
  onRetry,
  isDeleting 
}: DocumentCardProps) {
  const status = document.latest_job_status;
  const statusLabel = status ? JOB_STATUS_LABELS[status] : 'Pending';
  const statusStyles = getStatusStyles(status);
  const progress = document.latest_job_progress || 0;
  const stageLabel = document.latest_job_stage
    ? PROCESSING_STAGES[document.latest_job_stage]?.label || document.latest_job_stage.replace(/_/g, ' ')
    : null;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 overflow-hidden h-full flex flex-col">
      {/* Status indicator bar */}
      <div className={cn('h-1 shrink-0', statusStyles.bar)} />
      
      <CardContent className="p-4 flex flex-col flex-1">
        {/* Header - Fixed height section */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn('p-2 rounded-lg shrink-0', statusStyles.bg)}>
              {getFileIconComponent(document.file_type)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate" title={document.original_filename}>
                {document.original_filename}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {document.file_size_human} • {document.file_type.toUpperCase()}
              </p>
            </div>
          </div>
          
          {/* Action dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/documents/${document.id}`} className="flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {status === 'failed' && onRetry && document.latest_job_id && (
                <DropdownMenuItem onClick={() => onRetry(document.latest_job_id!)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Processing
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(document.id)}
                  disabled={isDeleting}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress section - Fixed height placeholder to maintain alignment */}
        <div className="h-10 mb-3">
          {status === 'processing' ? (
            <div>
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {stageLabel ? `${stageLabel} • ` : ''}{progress}%
              </p>
            </div>
          ) : status === 'failed' && document.latest_job_error ? (
            <p className="text-xs text-red-600 line-clamp-2">{document.latest_job_error}</p>
          ) : (
            <div className="h-full" /> 
          )}
        </div>

        {/* Spacer to push footer to bottom */}
        <div className="flex-1" />

        {/* Footer - Always at the bottom */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Badge 
            variant="outline" 
            className={cn('text-xs font-medium', statusStyles.text, statusStyles.border)}
          >
            {statusLabel}
          </Badge>
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatRelativeTime(document.created_at)}</span>
          </div>
        </div>

        {/* Action button - Always present with fixed height */}
        <div className="mt-3 h-9">
          {status === 'completed' ? (
            <Link href={`/documents/${document.id}`} className="block">
              <Button variant="outline" size="sm" className="w-full text-xs h-9">
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                View Results
              </Button>
            </Link>
          ) : status === 'failed' && onRetry && document.latest_job_id ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs h-9 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => onRetry(document.latest_job_id!)}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry Processing
            </Button>
          ) : (
            <Link href={`/documents/${document.id}`} className="block">
              <Button variant="ghost" size="sm" className="w-full text-xs h-9 text-muted-foreground">
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                View Details
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
