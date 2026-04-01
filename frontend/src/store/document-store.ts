/**
 * Document Store - Zustand state management for documents
 */
import { create } from 'zustand';
import { Document, DocumentFilters, Job, ProcessedResult, JobStatus } from '@/types';

interface DocumentState {
  documents: Document[];
  totalDocuments: number;
  currentPage: number;
  totalPages: number;
  filters: DocumentFilters;
  selectedDocument: Document | null;
  selectedJob: Job | null;
  selectedResult: ProcessedResult | null;
  isLoading: boolean;
  
  // Actions
  setDocuments: (documents: Document[], total: number, page: number, totalPages: number) => void;
  setFilters: (filters: Partial<DocumentFilters>) => void;
  resetFilters: () => void;
  setSelectedDocument: (document: Document | null) => void;
  setSelectedJob: (job: Job | null) => void;
  setSelectedResult: (result: ProcessedResult | null) => void;
  setLoading: (loading: boolean) => void;
  updateDocumentStatus: (documentId: string, status: JobStatus, jobId: string) => void;
  removeDocument: (documentId: string) => void;
}

const defaultFilters: DocumentFilters = {
  search: '',
  file_type: undefined,
  status: undefined,
  sort_by: 'created_at',
  sort_order: 'desc',
  page: 1,
  page_size: 10,
};

export const useDocumentStore = create<DocumentState>()((set) => ({
  documents: [],
  totalDocuments: 0,
  currentPage: 1,
  totalPages: 1,
  filters: defaultFilters,
  selectedDocument: null,
  selectedJob: null,
  selectedResult: null,
  isLoading: false,
  
  setDocuments: (documents, total, page, totalPages) => set({
    documents,
    totalDocuments: total,
    currentPage: page,
    totalPages,
  }),
  
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters },
  })),
  
  resetFilters: () => set({ filters: defaultFilters }),
  
  setSelectedDocument: (selectedDocument) => set({ selectedDocument }),
  
  setSelectedJob: (selectedJob) => set({ selectedJob }),
  
  setSelectedResult: (selectedResult) => set({ selectedResult }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  updateDocumentStatus: (documentId, status, jobId) => set((state) => ({
    documents: state.documents.map((doc) =>
      doc.id === documentId
        ? { ...doc, latest_job_status: status, latest_job_id: jobId }
        : doc
    ),
  })),
  
  removeDocument: (documentId) => set((state) => ({
    documents: state.documents.filter((doc) => doc.id !== documentId),
    totalDocuments: state.totalDocuments - 1,
  })),
}));
