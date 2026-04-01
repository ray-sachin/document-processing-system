'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useDocuments } from '@/hooks';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { UploadZone } from '@/components/upload/UploadZone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, FileText, Zap, Eye, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
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
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/documents" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Link>

          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-3">Upload Documents</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your documents for automatic processing. We support multiple file formats 
              and will extract key information automatically.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Upload Zone - Main Area */}
            <div className="lg:col-span-2">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Select Files
                  </CardTitle>
                  <CardDescription>
                    Drag and drop files or click to browse. Maximum 10 files, 50MB each.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UploadZone
                    onUpload={handleUpload}
                    isUploading={isUploading}
                    maxFiles={10}
                  />
                  
                  {uploadError && (
                    <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                      {uploadError}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Supported Formats */}
              <Card className="mt-6 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Supported File Formats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormatBadge format="PDF" description="Documents" />
                    <FormatBadge format="DOCX" description="Word Files" />
                    <FormatBadge format="TXT" description="Text Files" />
                    <FormatBadge format="CSV" description="Data Files" />
                    <FormatBadge format="PNG" description="Images" />
                    <FormatBadge format="JPG" description="Photos" />
                    <FormatBadge format="JPEG" description="Photos" />
                    <FormatBadge format="DOC" description="Legacy Word" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Process Info */}
            <div className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Processing Pipeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProcessStep
                    icon={<FileText className="h-5 w-5" />}
                    title="1. Parse Document"
                    description="Extract raw text and metadata"
                  />
                  <ProcessStep
                    icon={<Zap className="h-5 w-5" />}
                    title="2. Extract Fields"
                    description="Identify titles, keywords, summaries"
                  />
                  <ProcessStep
                    icon={<Eye className="h-5 w-5" />}
                    title="3. Review & Edit"
                    description="Verify and modify extracted data"
                  />
                  <ProcessStep
                    icon={<Download className="h-5 w-5" />}
                    title="4. Export"
                    description="Download as JSON or CSV"
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Real-Time Progress</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Track processing status live with instant updates as each stage completes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FormatBadge({ format, description }: { format: string; description: string }) {
  return (
    <div className="text-center p-3 bg-muted rounded-lg">
      <div className="font-mono font-bold text-primary">.{format.toLowerCase()}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </div>
  );
}

function ProcessStep({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-primary/10 text-primary rounded-lg">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
