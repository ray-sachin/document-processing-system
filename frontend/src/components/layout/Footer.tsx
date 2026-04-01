export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-background/75 py-6 backdrop-blur">
      <div className="app-shell flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium">Document Processing System</p>
          <p className="text-sm text-muted-foreground">
            Queue-backed review workflow built with FastAPI, Next.js, Celery, Redis, and PostgreSQL.
          </p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {new Date().getFullYear()} • Summer Training Submission
        </p>
      </div>
    </footer>
  );
}
