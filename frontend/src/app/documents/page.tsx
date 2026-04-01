'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useDocuments, useJobActions } from '@/hooks';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DocumentList } from '@/components/documents/DocumentList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Loader2, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { DocumentFilters } from '@/types';
import { toast } from 'sonner';

export default function DocumentsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    documents,
    totalDocuments,
    currentPage,
    totalPages,
    filters,
    isLoading,
    updateFilters,
    goToPage,
    deleteDocument,
    refetch,
  } = useDocuments();
  const { retry } = useJobActions();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const stats = {
    total: totalDocuments,
    completed: documents.filter(d => d.latest_job_status === 'completed').length,
    processing: documents.filter(d => d.latest_job_status === 'processing' || d.latest_job_status === 'queued').length,
    failed: documents.filter(d => d.latest_job_status === 'failed').length,
  };

  const handleSearchChange = (search: string) => {
    updateFilters({ search, page: 1 });
  };

  const handleStatusChange = (status: string) => {
    updateFilters({ 
      status: status === 'all' ? undefined : status as DocumentFilters['status'],
      page: 1 
    });
  };

  const handleSortChange = (sort: string) => {
    const [sort_by, sort_order] = sort.split(':');
    updateFilters({ 
      sort_by: sort_by as DocumentFilters['sort_by'], 
      sort_order: sort_order as DocumentFilters['sort_order'] 
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id);
      toast.success('Document deleted.');
    }
  };

  const handleRetry = async (jobId: string) => {
    await retry({ jobId });
    toast.success('Job re-queued for processing.');
    refetch();
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />
      <main className="app-shell flex-1 py-8">
        <section className="surface-panel page-grid mb-8 overflow-hidden rounded-[28px] border-border/70 p-6 sm:p-8">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Review Workspace
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Documents Dashboard
              </h1>
              <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
                Track uploads, watch processing progress, and move reviewed files toward export without losing context.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/upload">
                <Button size="lg" className="h-12 gap-2 px-6 shadow-lg shadow-primary/15">
                  <Upload className="h-5 w-5" />
                  Upload Documents
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            icon={<FileText className="h-5 w-5" />}
            label="Total Documents"
            value={stats.total}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatsCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Completed"
            value={stats.completed}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <StatsCard
            icon={<Clock className="h-5 w-5" />}
            label="Processing"
            value={stats.processing}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <StatsCard
            icon={<XCircle className="h-5 w-5" />}
            label="Failed"
            value={stats.failed}
            color="text-red-600"
            bgColor="bg-red-50"
          />
        </section>

        <Card className="overflow-hidden rounded-[28px] border-border/80 bg-background/85 shadow-sm">
          <CardContent className="p-5 sm:p-7">
            <DocumentList
              documents={documents}
              total={totalDocuments}
              page={currentPage}
              totalPages={totalPages}
              search={filters.search || ''}
              status={filters.status || ''}
              sortBy={`${filters.sort_by}:${filters.sort_order}`}
              onSearchChange={handleSearchChange}
              onStatusChange={handleStatusChange}
              onSortChange={handleSortChange}
              onPageChange={goToPage}
              onDelete={handleDelete}
              onRetry={handleRetry}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function StatsCard({ 
  icon, 
  label, 
  value, 
  color, 
  bgColor 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="overflow-hidden rounded-3xl border-border/70 bg-background/90 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`rounded-2xl p-3 ${bgColor} ${color}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-3xl font-bold leading-none">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
