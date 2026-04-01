'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PROCESSING_STAGES } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface JobProgressProps {
  status: string;
  progress: number;
  stage: string | null;
  message?: string;
  isConnected?: boolean;
}

export function JobProgress({
  status,
  progress,
  stage,
  message,
  isConnected = false,
}: JobProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'queued':
        return <Clock className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'info';
      case 'queued':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const stageInfo = stage ? PROCESSING_STAGES[stage] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium capitalize">{status}</span>
          {isConnected && status === 'processing' && (
            <span className="text-xs text-green-500">● Live</span>
          )}
        </div>
        <Badge variant={getStatusColor() as "default" | "secondary" | "destructive" | "outline"}>
          {progress >= 0 ? `${progress}%` : 'Error'}
        </Badge>
      </div>

      {status === 'processing' && (
        <Progress value={progress} className="h-2" />
      )}

      {stageInfo && (
        <div className="text-sm text-muted-foreground">
          Stage: {stageInfo.label}
        </div>
      )}

      {message && (
        <p className={cn(
          "text-sm",
          status === 'failed' ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {message}
        </p>
      )}

      {/* Processing stages visualization */}
      {status === 'processing' && (
        <div className="grid grid-cols-7 gap-1">
          {Object.entries(PROCESSING_STAGES)
            .filter(([key]) => key !== 'job_failed')
            .map(([key, info]) => (
              <div
                key={key}
                className={cn(
                  "h-1 rounded",
                  progress >= info.progress
                    ? 'bg-primary'
                    : 'bg-muted'
                )}
                title={info.label}
              />
            ))}
        </div>
      )}
    </div>
  );
}
