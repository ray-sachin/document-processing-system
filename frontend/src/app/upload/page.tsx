'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useDocuments } from '@/hooks';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { UploadZone } from '@/components/upload/UploadZone';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Clock3,
  FileCheck2,
  FileText,
  Loader2,
  Radar,
  ScanSearch,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

const supportedFormats = ['PDF', 'DOCX', 'DOC', 'TXT', 'CSV', 'PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'BMP', 'TIFF'];

const pipelineSteps = [
  {
    icon: Upload,
    title: 'Intake and queueing',
    description: 'Files are stored, fingerprinted, and scheduled for background processing immediately.',
  },
  {
    icon: ScanSearch,
    title: 'Parsing and OCR',
    description: 'The worker extracts embedded text first, then falls back to OCR for scans and image-heavy pages.',
  },
  {
    icon: FileCheck2,
    title: 'Review and finalize',
    description: 'Users can inspect extracted fields, make edits, and finalize records before export.',
  },
];

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { upload, isUploading, uploadError } = useDocuments();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleUpload = async (files: File[]) => {
    try {
      await upload(files);
      toast.success(`${files.length} document${files.length > 1 ? 's' : ''} queued for processing.`);
      router.push('/documents');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please check the file types and try again.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />
      <main className="app-shell flex-1 py-8">
        <section className="surface-panel page-grid mb-8 overflow-hidden rounded-[28px] border-border/70 p-6 sm:p-8">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <Link
                href="/documents"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to documents
              </Link>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Intake Workspace
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Upload documents with review-ready processing.
              </h1>
              <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
                Bring in batches from office files, plain text, spreadsheets, or scans. Each file is queued in the
                background so the review team can keep moving while extraction runs.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
              <MetricCard icon={<FileText className="h-5 w-5" />} label="Formats" value={`${supportedFormats.length} supported`} />
              <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Upload limit" value="50 MB per file" />
              <MetricCard icon={<Clock3 className="h-5 w-5" />} label="Processing model" value="Background queue" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          <Card className="overflow-hidden rounded-[28px] border-border/80 bg-background/90 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Drop Zone
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Add files for processing</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    The system accepts mixed batches and queues each upload independently, so one bad file does not
                    block the rest of the batch.
                  </p>
                </div>

                <Button asChild variant="outline" className="rounded-full px-5">
                  <Link href="/documents">Open dashboard</Link>
                </Button>
              </div>

              <div className="mt-6">
                <UploadZone onUpload={handleUpload} isUploading={isUploading} maxFiles={10} />

                {uploadError && (
                  <div className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {uploadError}
                  </div>
                )}
              </div>

              <div className="mt-8 rounded-[24px] border border-border/70 bg-muted/35 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Supported formats</p>
                    <p className="text-sm text-muted-foreground">
                      Optimized for PDFs, office documents, flat files, and scanned images.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {supportedFormats.map((format) => (
                      <Badge key={format} variant="outline" className="rounded-full bg-background/90 px-3 py-1 text-[11px] tracking-wide">
                        {format}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[28px] border-border/80 bg-background/90 shadow-sm">
              <CardContent className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Processing Flow
                </p>
                <div className="mt-5 space-y-5">
                  {pipelineSteps.map((step) => (
                    <ProcessStep
                      key={step.title}
                      icon={<step.icon className="h-5 w-5" />}
                      title={step.title}
                      description={step.description}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border-border/80 bg-background/90 shadow-sm">
              <CardContent className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Intake Notes
                </p>
                <div className="mt-5 space-y-4">
                  <InsightCard
                    icon={<Radar className="h-5 w-5" />}
                    title="Scanned file support"
                    description="Embedded text is used when available, with OCR fallback for scans and image-based pages."
                  />
                  <InsightCard
                    icon={<ShieldCheck className="h-5 w-5" />}
                    title="Stable batch behavior"
                    description="Each upload becomes its own job, so retries and failures stay isolated to the affected record."
                  />
                  <InsightCard
                    icon={<Clock3 className="h-5 w-5" />}
                    title="Review-friendly workflow"
                    description="Results land in the dashboard with live status updates and can be finalized before export."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-background/90 p-4 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function ProcessStep({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function InsightCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-muted/35 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-background text-primary shadow-sm">
          {icon}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
