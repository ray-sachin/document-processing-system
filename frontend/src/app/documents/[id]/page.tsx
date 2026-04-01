'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useDocument, useProgress, useResultActions, useExport, useJobActions } from '@/hooks';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { JobProgress } from '@/components/jobs/JobProgress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Download,
  Save,
  CheckCircle,
  Loader2,
  RefreshCw,
  FileText,
  Calendar,
  HardDrive,
  Tag,
  FileType,
  Info,
  Edit3,
  X,
  Shield,
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';

function getFileIconComponent(fileType: string) {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return <FileText className="h-6 w-6 text-red-500" />;
    case 'docx':
    case 'doc':
      return <FileType className="h-6 w-6 text-blue-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <FileText className="h-6 w-6 text-amber-600" />;
    default:
      return <FileText className="h-6 w-6 text-primary" />;
  }
}

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { document, job, result, isLoading, refetch } = useDocument(documentId);
  const { update, isUpdating, finalize, isFinalizing } = useResultActions();
  const { exportSingleJson, exportSingleCsv } = useExport();
  const { retry, isRetrying } = useJobActions();
  
  // Real-time progress for processing jobs
  const {
    progress: liveProgress,
    stage: liveStage,
    status: liveStatus,
    message: liveMessage,
    isConnected,
  } = useProgress(job?.status === 'processing' ? job.id : '');
  
  // Editable fields
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [keywords, setKeywords] = useState('');

  // Initialize editable fields when result loads
  useEffect(() => {
    if (result) {
      setTitle(result.extracted_title || '');
      setCategory(result.extracted_category || '');
      setSummary(result.extracted_summary || '');
      setKeywords(result.extracted_keywords?.join(', ') || '');
    }
  }, [result]);

  // Refresh when job completes
  useEffect(() => {
    if (liveStatus === 'completed' || liveStatus === 'failed') {
      refetch();
    }
  }, [liveStatus, refetch]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <Header />
        <main className="app-shell flex-1 py-12">
          <Card className="max-w-md mx-auto p-8 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Document not found</h2>
            <p className="text-muted-foreground mb-6">The document you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
            <Link href="/documents">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Documents
              </Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const handleSave = async () => {
    if (!job?.id) return;
    
    await update({
      jobId: job.id,
      data: {
        extracted_title: title,
        extracted_category: category,
        extracted_summary: summary,
        extracted_keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      },
    });
    
    setEditMode(false);
    toast.success('Review changes saved.');
    refetch();
  };

  const handleFinalize = async () => {
    if (!job?.id) return;
    
    if (confirm('Are you sure you want to finalize this result? It cannot be edited after finalization.')) {
      await finalize(job.id);
      toast.success('Result finalized and locked.');
      refetch();
    }
  };

  const handleExportJson = async () => {
    if (!job?.id) return;
    await exportSingleJson(job.id, document.original_filename);
    toast.success('JSON export started.');
  };

  const handleExportCsv = async () => {
    if (!job?.id) return;
    await exportSingleCsv(job.id, document.original_filename);
    toast.success('CSV export started.');
  };

  const handleRetry = async () => {
    if (!job?.id) return;
    await retry({ jobId: job.id });
    toast.success('Job re-queued for processing.');
    refetch();
  };

  // Use live progress if available
  const currentProgress = liveStatus ? liveProgress : (job?.progress ?? document.latest_job_progress ?? 0);
  const currentStage = liveStatus ? liveStage : (job?.current_stage ?? document.latest_job_stage);
  const currentStatus = liveStatus || job?.status || document.latest_job_status || 'queued';

  const infoItems = [
    { label: 'File Type', value: document.file_type.toUpperCase(), icon: FileType },
    { label: 'File Size', value: document.file_size_human, icon: HardDrive },
    { label: 'MIME Type', value: document.mime_type || 'Unknown', icon: Info },
    { label: 'Uploaded', value: formatDate(document.created_at), icon: Calendar },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />
      <main className="app-shell flex-1 py-8">
        {/* Breadcrumb & Header */}
        <div className="mb-8">
          <Link 
            href="/documents" 
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Link>
          
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                {getFileIconComponent(document.file_type)}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{document.original_filename}</h1>
                <p className="text-muted-foreground mt-1">
                  {document.file_size_human} • {document.file_type.toUpperCase()}
                </p>
              </div>
            </div>
            
            {/* Quick Actions */}
            {result && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportJson}>
                  <Download className="h-4 w-4 mr-1.5" />
                  JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCsv}>
                  <Download className="h-4 w-4 mr-1.5" />
                  CSV
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Status & Info */}
          <div className="space-y-6">
            {/* Processing Status */}
            <Card className="overflow-hidden">
              <div className={cn(
                'h-1',
                currentStatus === 'completed' ? 'bg-green-500' :
                currentStatus === 'failed' ? 'bg-red-500' :
                currentStatus === 'processing' ? 'bg-blue-500' :
                'bg-yellow-500'
              )} />
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Processing Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JobProgress
                  status={currentStatus}
                  progress={currentProgress}
                  stage={currentStage || null}
                  message={liveMessage || job?.error_message || undefined}
                  isConnected={isConnected}
                />
                
                {job?.status === 'failed' && (
                  <Button 
                    className="mt-4 w-full" 
                    variant="outline"
                    onClick={handleRetry}
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Retry Processing
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Document Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Document Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {infoItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {result ? (
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-muted-foreground" />
                        Extracted Results
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {result.is_finalized 
                          ? 'This result has been finalized and is locked for editing.'
                          : 'Review and edit the extracted information before finalizing.'
                        }
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {result.is_finalized ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Finalized
                        </Badge>
                      ) : (
                        <>
                          {editMode ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditMode(false)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                                {isUpdating ? (
                                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="mr-1.5 h-4 w-4" />
                                )}
                                Save Changes
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditMode(true)}
                              >
                                <Edit3 className="h-4 w-4 mr-1.5" />
                                Edit
                              </Button>
                              <Button size="sm" onClick={handleFinalize} disabled={isFinalizing}>
                                {isFinalizing ? (
                                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="mr-1.5 h-4 w-4" />
                                )}
                                Finalize
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Title</Label>
                      {editMode ? (
                        <Input 
                          value={title} 
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter document title"
                        />
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-lg text-sm min-h-[42px] flex items-center">
                          {title || <span className="text-muted-foreground italic">Not extracted</span>}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Category</Label>
                      {editMode ? (
                        <Input 
                          value={category} 
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="Enter category"
                        />
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-lg text-sm min-h-[42px] flex items-center">
                          {category ? (
                            <Badge variant="secondary">{category}</Badge>
                          ) : (
                            <span className="text-muted-foreground italic">Not extracted</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Summary</Label>
                    {editMode ? (
                      <Textarea 
                        value={summary} 
                        onChange={(e) => setSummary(e.target.value)}
                        rows={5}
                        placeholder="Enter document summary"
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-lg text-sm min-h-[120px]">
                        {summary || <span className="text-muted-foreground italic">Not extracted</span>}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Keywords</Label>
                    {editMode ? (
                      <Input 
                        value={keywords} 
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="keyword1, keyword2, keyword3"
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-lg min-h-[42px]">
                        {result.extracted_keywords?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {result.extracted_keywords.map((kw: string, i: number) => (
                              <Badge key={i} variant="outline" className="bg-background">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">No keywords extracted</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Export Section */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3">Export Options</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={handleExportJson} className="flex-1 sm:flex-none">
                        <Download className="mr-2 h-4 w-4" />
                        Export as JSON
                      </Button>
                      <Button variant="outline" onClick={handleExportCsv} className="flex-1 sm:flex-none">
                        <Download className="mr-2 h-4 w-4" />
                        Export as CSV
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-12">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                    {currentStatus === 'processing' ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : currentStatus === 'failed' ? (
                      <X className="h-8 w-8 text-red-500" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-1">
                    {currentStatus === 'processing' 
                      ? 'Processing Document...'
                      : currentStatus === 'failed'
                      ? 'Processing Failed'
                      : 'Waiting for Processing'
                    }
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {currentStatus === 'processing'
                      ? 'Results will appear here once processing is complete.'
                      : currentStatus === 'failed'
                      ? 'The document processing failed. Please retry.'
                      : 'Document is queued for processing.'
                    }
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
