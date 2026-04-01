/**
 * useDocuments Hook - Document management logic
 */
'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDocumentStore } from '@/store/document-store';
import { documentsApi, jobsApi, resultsApi, exportApi } from '@/lib/api';
import { DocumentFilters } from '@/types';
import { downloadBlob, parseApiError } from '@/lib/utils';

export function useDocuments(filters?: Partial<DocumentFilters>) {
  const queryClient = useQueryClient();
  const {
    documents,
    totalDocuments,
    currentPage,
    totalPages,
    filters: storeFilters,
    setDocuments,
    setFilters,
    setLoading,
    removeDocument,
  } = useDocumentStore();

  const activeFilters = { ...storeFilters, ...filters };

  // Fetch documents
  const documentsQuery = useQuery({
    queryKey: ['documents', activeFilters],
    queryFn: async () => {
      setLoading(true);
      try {
        const response = await documentsApi.list(activeFilters);
        setDocuments(
          response.items,
          response.total,
          response.page,
          response.total_pages
        );
        return response;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 30000, // 30 seconds
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      return await documentsApi.upload(files);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await documentsApi.delete(id);
      return id;
    },
    onSuccess: (id) => {
      removeDocument(id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const updateFilters = useCallback(
    (newFilters: Partial<DocumentFilters>) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  const goToPage = useCallback(
    (page: number) => {
      setFilters({ page });
    },
    [setFilters]
  );

  return {
    documents,
    totalDocuments,
    currentPage,
    totalPages,
    filters: activeFilters,
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error ? parseApiError(documentsQuery.error) : null,
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error ? parseApiError(uploadMutation.error) : null,
    deleteDocument: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    updateFilters,
    goToPage,
    refetch: documentsQuery.refetch,
  };
}

export function useDocument(id: string) {
  const { setSelectedDocument, setSelectedJob, setSelectedResult } = useDocumentStore();

  const documentQuery = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const document = await documentsApi.get(id);
      setSelectedDocument(document);
      return document;
    },
    enabled: !!id,
  });

  const jobQuery = useQuery({
    queryKey: ['job', documentQuery.data?.latest_job_id],
    queryFn: async () => {
      if (!documentQuery.data?.latest_job_id) return null;
      const job = await jobsApi.get(documentQuery.data.latest_job_id);
      setSelectedJob(job);
      return job;
    },
    enabled: !!documentQuery.data?.latest_job_id,
  });

  const resultQuery = useQuery({
    queryKey: ['result', documentQuery.data?.latest_job_id],
    queryFn: async () => {
      if (!documentQuery.data?.latest_job_id) return null;
      try {
        const result = await resultsApi.get(documentQuery.data.latest_job_id);
        setSelectedResult(result);
        return result;
      } catch {
        return null;
      }
    },
    enabled: !!documentQuery.data?.latest_job_id && jobQuery.data?.status === 'completed',
  });

  return {
    document: documentQuery.data,
    job: jobQuery.data,
    result: resultQuery.data,
    isLoading: documentQuery.isLoading || jobQuery.isLoading,
    error: documentQuery.error ? parseApiError(documentQuery.error) : null,
    refetch: () => {
      documentQuery.refetch();
      jobQuery.refetch();
      resultQuery.refetch();
    },
  };
}

export function useJobActions() {
  const queryClient = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: async ({ jobId, resetRetryCount = false }: { jobId: string; resetRetryCount?: boolean }) => {
      return await jobsApi.retry(jobId, resetRetryCount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return await jobsApi.cancel(jobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  return {
    retry: retryMutation.mutateAsync,
    isRetrying: retryMutation.isPending,
    cancel: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
}

export function useResultActions() {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ jobId, data }: { jobId: string; data: Record<string, unknown> }) => {
      return await resultsApi.update(jobId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['result', variables.jobId] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return await resultsApi.finalize(jobId);
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['result', jobId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  return {
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    finalize: finalizeMutation.mutateAsync,
    isFinalizing: finalizeMutation.isPending,
  };
}

export function useExport() {
  const exportJson = useCallback(async (finalizedOnly = true) => {
    const blob = await exportApi.exportAllJson(finalizedOnly);
    const filename = `export_${new Date().toISOString().slice(0, 10)}.json`;
    downloadBlob(blob, filename);
  }, []);

  const exportCsv = useCallback(async (finalizedOnly = true) => {
    const blob = await exportApi.exportAllCsv(finalizedOnly);
    const filename = `export_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadBlob(blob, filename);
  }, []);

  const exportSingleJson = useCallback(async (jobId: string, filename: string) => {
    const blob = await exportApi.exportSingleJson(jobId);
    downloadBlob(blob, `${filename}.json`);
  }, []);

  const exportSingleCsv = useCallback(async (jobId: string, filename: string) => {
    const blob = await exportApi.exportSingleCsv(jobId);
    downloadBlob(blob, `${filename}.csv`);
  }, []);

  return {
    exportJson,
    exportCsv,
    exportSingleJson,
    exportSingleCsv,
  };
}
