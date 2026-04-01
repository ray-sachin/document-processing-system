/**
 * Document types
 */
import { JobStatus } from './job';

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  file_size_human: string;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
  latest_job_status: JobStatus | null;
  latest_job_id: string | null;
  latest_job_progress?: number | null;
  latest_job_stage?: string | null;
  latest_job_error?: string | null;
}

export interface DocumentListResponse {
  items: Document[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DocumentFilters {
  search?: string;
  file_type?: string;
  status?: JobStatus;
  sort_by?: 'created_at' | 'updated_at' | 'original_filename' | 'file_size';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  queued: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};
