'use client';

import { Document } from '@/types';
import { DocumentCard } from './DocumentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  Filter,
  SortAsc,
  Upload
} from 'lucide-react';
import Link from 'next/link';

interface DocumentListProps {
  documents: Document[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  sortBy: string;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
  onSortChange: (sort: string) => void;
  onPageChange: (page: number) => void;
  onDelete: (id: string) => void;
  onRetry: (jobId: string) => void;
  isLoading: boolean;
}

export function DocumentList({
  documents,
  total,
  page,
  totalPages,
  search,
  status,
  sortBy,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onPageChange,
  onDelete,
  onRetry,
  isLoading,
}: DocumentListProps) {
  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by filename..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={status || 'all'} onValueChange={onStatusChange}>
                <SelectTrigger className="w-[150px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="queued">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      Queued
                    </span>
                  </SelectItem>
                  <SelectItem value="processing">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Processing
                    </span>
                  </SelectItem>
                  <SelectItem value="completed">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Completed
                    </span>
                  </SelectItem>
                  <SelectItem value="failed">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Failed
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at:desc">Newest First</SelectItem>
                  <SelectItem value="created_at:asc">Oldest First</SelectItem>
                  <SelectItem value="original_filename:asc">Name (A-Z)</SelectItem>
                  <SelectItem value="original_filename:desc">Name (Z-A)</SelectItem>
                  <SelectItem value="file_size:desc">Size (Largest)</SelectItem>
                  <SelectItem value="file_size:asc">Size (Smallest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0 ? 'No documents' : `Showing ${documents.length} of ${total} documents`}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
        )}
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-1 bg-muted animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-px bg-muted" />
                <div className="flex justify-between">
                  <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No documents found</h3>
              <p className="text-muted-foreground mt-1">
                {search || status !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Upload your first document to get started'
                }
              </p>
            </div>
            {!search && status === 'all' && (
              <Link href="/upload">
                <Button className="mt-2">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={onDelete}
              onRetry={onRetry}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
