'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useExport } from '@/hooks';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  Loader2,
  CheckCircle,
  FileText,
  Clock,
  Tag,
  Shield,
  Info
} from 'lucide-react';

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
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
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

  const exportFields = [
    { icon: FileText, label: 'Document ID & Filename', desc: 'Unique identifiers' },
    { icon: Tag, label: 'Title, Category & Summary', desc: 'Extracted content' },
    { icon: Info, label: 'Keywords & Metadata', desc: 'Additional data' },
    { icon: Clock, label: 'Processing Timestamps', desc: 'Created & updated times' },
    { icon: Shield, label: 'Finalization Status', desc: 'Review state' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Download className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Export Data</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Download your processed documents in your preferred format for further analysis or archiving.
            </p>
          </div>

          {/* Export Options Toggle */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="finalizedOnly" className="text-base font-medium cursor-pointer">
                      Finalized Results Only
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Export only documents that have been reviewed and finalized
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="finalizedOnly"
                    checked={finalizedOnly}
                    onChange={(e) => setFinalizedOnly(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Export Format Cards */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            {/* JSON Export Card */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <FileJson className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">JSON Format</CardTitle>
                    <CardDescription>Full data structure</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Complete data with full metadata</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Preserves nested structures</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Ideal for programmatic access</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleExportJson}
                  disabled={isExporting}
                  className="w-full mt-2"
                  size="lg"
                >
                  {isExporting && exportType === 'json' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download JSON
                </Button>
              </CardContent>
            </Card>

            {/* CSV Export Card */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-200 border-2 hover:border-green-500/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">CSV Format</CardTitle>
                    <CardDescription>Spreadsheet compatible</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Open in Excel, Google Sheets</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Easy to filter and sort</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Perfect for reports and analysis</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleExportCsv}
                  disabled={isExporting}
                  className="w-full mt-2 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isExporting && exportType === 'csv' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download CSV
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Export Contents Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                What&apos;s Included in Export
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {exportFields.map((field, index) => {
                  const Icon = field.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{field.label}</p>
                        <p className="text-xs text-muted-foreground">{field.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Status indicator */}
          <div className="mt-6 text-center">
            <Badge variant="outline" className="text-xs">
              {finalizedOnly ? 'Exporting finalized results only' : 'Exporting all completed results'}
            </Badge>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
