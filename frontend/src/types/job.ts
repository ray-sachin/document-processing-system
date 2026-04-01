/**
 * Job types
 */
export interface Job {
  id: string;
  document_id: string;
  user_id: string;
  status: JobStatus;
  progress: number;
  current_stage: string | null;
  celery_task_id: string | null;
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  document_filename: string | null;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface JobListResponse {
  items: Job[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ProgressEvent {
  job_id: string;
  event: string;
  status: JobStatus;
  stage: string;
  progress: number;
  message: string;
  timestamp: string;
}

export interface ProcessedResult {
  id: string;
  job_id: string;
  document_id: string;
  extracted_title: string | null;
  extracted_category: string | null;
  extracted_summary: string | null;
  extracted_keywords: string[] | null;
  extracted_metadata: Record<string, unknown> | null;
  raw_text: string | null;
  structured_data: Record<string, unknown> | null;
  is_finalized: boolean;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResultUpdate {
  extracted_title?: string;
  extracted_category?: string;
  extracted_summary?: string;
  extracted_keywords?: string[];
  extracted_metadata?: Record<string, unknown>;
  structured_data?: Record<string, unknown>;
}

export const PROCESSING_STAGES: Record<string, { label: string; progress: number }> = {
  document_received: { label: 'Document Received', progress: 10 },
  parsing_started: { label: 'Parsing Started', progress: 20 },
  parsing_completed: { label: 'Parsing Completed', progress: 40 },
  extraction_started: { label: 'Extraction Started', progress: 50 },
  extraction_completed: { label: 'Extraction Completed', progress: 80 },
  storing_result: { label: 'Storing Result', progress: 90 },
  job_completed: { label: 'Completed', progress: 100 },
  job_failed: { label: 'Failed', progress: -1 },
};
