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
      <main className="flex-1 container py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documents Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Upload, process, and manage your documents
            </p>
          </div>
          <Link href="/upload">
            <Button size="lg" className="gap-2 shadow-lg">
              <Upload className="h-5 w-5" />
              Upload Documents
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
        </div>

        {/* Document List */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
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
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bgColor} ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
