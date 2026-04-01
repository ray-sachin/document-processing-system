'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useExport } from '@/hooks';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  TableProperties,
} from 'lucide-react';

const exportFields = [
  'Document and job identifiers',
  'Original filename and review status',
  'Title, category, summary, and keywords',
  'Structured metadata from parsing and OCR',
  'Created, updated, and finalized timestamps',
];

export default function ExportsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { exportJson, exportCsv } = useExport();

  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'json' | 'csv' | null>(null);
  const [finalizedOnly, setFinalizedOnly] = useState(true);

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
          <p className="mt-3 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleExportJson = async () => {
    setIsExporting(true);
    setExportType('json');
    try {
      await exportJson(finalizedOnly);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    setExportType('csv');
    try {
      await exportCsv(finalizedOnly);
    } finally {
      setIsExporting(false);
      setExportType(null);
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
                Delivery Workspace
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Export reviewed records in operational formats.
              </h1>
              <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
                Ship finalized data to downstream systems as structured JSON or spreadsheet-friendly CSV without losing
                review context or processing metadata.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
              <MetricCard icon={<FileJson className="h-5 w-5" />} label="Structured handoff" value="JSON export" />
              <MetricCard icon={<TableProperties className="h-5 w-5" />} label="Spreadsheet handoff" value="CSV export" />
              <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Default filter" value="Finalized only" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[28px] border-border/80 bg-background/90 shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                      Export Scope
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Choose what leaves the workspace</h2>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                      Keep exports limited to finalized records by default, or include all completed outputs if you need
                      a broader operational snapshot.
                    </p>
                  </div>

                  <Badge variant="outline" className="rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.2em]">
                    {finalizedOnly ? 'Finalized results' : 'All completed results'}
                  </Badge>
                </div>

                <div className="mt-6 rounded-[24px] border border-border/70 bg-muted/35 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-primary shadow-sm">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <Label htmlFor="finalizedOnly" className="cursor-pointer text-base font-medium">
                          Finalized results only
                        </Label>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Recommended for clean submissions and downstream imports.
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex cursor-pointer items-center self-start sm:self-auto">
                      <input
                        type="checkbox"
                        id="finalizedOnly"
                        checked={finalizedOnly}
                        onChange={(event) => setFinalizedOnly(event.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <FormatCard
                    accent="primary"
                    icon={<FileJson className="h-6 w-6" />}
                    title="JSON export"
                    description="Full-fidelity records with nested metadata and structured result payloads."
                    bullets={[
                      'Best for API ingestion and archival',
                      'Preserves metadata and nested structures',
                      'Matches the application result model closely',
                    ]}
                    buttonLabel="Download JSON"
                    onClick={handleExportJson}
                    isBusy={isExporting && exportType === 'json'}
                  />

                  <FormatCard
                    accent="emerald"
                    icon={<FileSpreadsheet className="h-6 w-6" />}
                    title="CSV export"
                    description="Flat records optimized for spreadsheet review, sorting, and quick analysis."
                    bullets={[
                      'Easy to open in Excel or Google Sheets',
                      'Good for reviews, reports, and handoff tables',
                      'Keeps key document and status fields visible',
                    ]}
                    buttonLabel="Download CSV"
                    onClick={handleExportCsv}
                    isBusy={isExporting && exportType === 'csv'}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[28px] border-border/80 bg-background/90 shadow-sm">
              <CardContent className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Included Fields
                </p>
                <div className="mt-5 space-y-3">
                  {exportFields.map((field) => (
                    <div key={field} className="flex items-start gap-3 rounded-[20px] border border-border/70 bg-muted/35 p-4">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-sm">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <p className="text-sm text-foreground">{field}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border-border/80 bg-background/90 shadow-sm">
              <CardContent className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Delivery Notes
                </p>
                <div className="mt-5 space-y-4">
                  <InsightCard
                    icon={<Sparkles className="h-5 w-5" />}
                    title="Clean exports"
                    description="Use finalized-only mode when you want the cleanest version of reviewed records."
                  />
                  <InsightCard
                    icon={<FileText className="h-5 w-5" />}
                    title="Operational traceability"
                    description="Exports retain timestamps and identifiers so records can be reconciled back to the queue."
                  />
                  <InsightCard
                    icon={<Download className="h-5 w-5" />}
                    title="Single-record export available"
                    description="Detailed document views still support per-result downloads when you only need one file."
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

function FormatCard({
  accent,
  icon,
  title,
  description,
  bullets,
  buttonLabel,
  onClick,
  isBusy,
}: {
  accent: 'primary' | 'emerald';
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  buttonLabel: string;
  onClick: () => Promise<void>;
  isBusy: boolean;
}) {
  const accentClasses =
    accent === 'emerald'
      ? {
          icon: 'bg-emerald-50 text-emerald-700',
          button: 'bg-emerald-600 text-white hover:bg-emerald-700',
          border: 'hover:border-emerald-400/60',
        }
      : {
          icon: 'bg-primary/10 text-primary',
          button: '',
          border: 'hover:border-primary/40',
        };

  return (
    <div
      className={`rounded-[24px] border border-border/70 bg-background p-5 shadow-sm transition-colors ${accentClasses.border}`}
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${accentClasses.icon}`}>{icon}</div>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>

      <div className="mt-5 space-y-3">
        {bullets.map((bullet) => (
          <div key={bullet} className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{bullet}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={onClick}
        disabled={isBusy}
        className={`mt-6 h-11 w-full gap-2 rounded-full px-5 ${accentClasses.button}`}
      >
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {buttonLabel}
      </Button>
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
