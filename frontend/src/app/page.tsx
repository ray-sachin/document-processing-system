'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/documents');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2.5 shadow-sm">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <span className="block text-lg font-semibold tracking-tight">DocProcessor</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Queue-backed document workflow
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="container mx-auto px-4 pb-10 pt-14">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-primary" />
                Built for upload, review, and export
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
                Review-ready document processing for teams that need visibility.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Upload one file or a full batch, watch each job move through the queue, review the extracted fields,
                and ship finalized records as JSON or CSV without losing the execution trail.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="gap-2 rounded-full px-6">
                    Open The Workspace <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="rounded-full px-6">
                    Sign In
                  </Button>
                </Link>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Background jobs" value="Celery + Redis" />
                <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label="Review controls" value="Edit + finalize" />
                <MetricCard icon={<Download className="h-4 w-4" />} label="Delivery" value="JSON / CSV export" />
              </div>
            </div>

            <div className="surface-panel page-grid rounded-[28px] p-5 sm:p-6">
              <div className="rounded-[22px] border border-border/70 bg-background/95 p-5 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                      Live Queue
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">Operations Board</h2>
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    3 jobs active
                  </div>
                </div>

                <div className="space-y-4">
                  <SignalRow title="vendor_packet_q2.pdf" status="Parsing Completed" progress={40} />
                  <SignalRow title="employee_roster.csv" status="Field Extraction" progress={80} />
                  <SignalRow title="meeting-notes.txt" status="Ready For Review" progress={100} />
                </div>

                <div className="mt-6 rounded-2xl border border-border/70 bg-muted/40 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Final Review
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Title</p>
                      <p className="font-medium">Q2 Vendor Contract Summary</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium">Procurement</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Keywords</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['renewal', 'vendor', 'pricing', 'timeline'].map((keyword) => (
                          <span key={keyword} className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              icon={<Upload className="h-10 w-10 text-primary" />}
              title="Batch Intake"
              description="Bring in PDFs, office files, text, CSV, and common image formats in one queue."
            />
            <FeatureCard
              icon={<BarChart3 className="h-10 w-10 text-primary" />}
              title="Live Status Tracking"
              description="See every stage move in real time with WebSocket updates and progress-aware detail views."
            />
            <FeatureCard
              icon={<FileText className="h-10 w-10 text-primary" />}
              title="Structured Review"
              description="Review extracted titles, categories, summaries, and keywords before locking a record."
            />
            <FeatureCard
              icon={<Download className="h-10 w-10 text-primary" />}
              title="Operational Export"
              description="Export one reviewed file or the whole finalized set in JSON or CSV when the job is done."
            />
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="surface-panel rounded-[28px] p-8">
            <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Architecture
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Built for async work, not request-time shortcuts</h2>
              </div>
              <p className="max-w-xl text-sm text-muted-foreground">
                The app keeps processing in the background, exposes status updates to the UI, and separates upload,
                review, and export into clear user-facing steps.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <TechCard
                title="Async Processing"
                items={['Celery Workers', 'Redis Pub/Sub', 'Background Jobs']}
              />
              <TechCard
                title="Real-Time Updates"
                items={['WebSocket Support', 'SSE Fallback', 'Live Progress']}
              />
              <TechCard
                title="Full Stack"
                items={['Next.js + TypeScript', 'FastAPI + Python', 'PostgreSQL + Redis']}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em]">Queue-backed document operations</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="surface-panel rounded-[24px] p-6 transition-colors hover:border-primary/30">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TechCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-background/85 p-5 text-center shadow-sm">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-center justify-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="surface-panel rounded-[22px] p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function SignalRow({ title, status, progress }: { title: string; status: string; progress: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{status}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {progress}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
