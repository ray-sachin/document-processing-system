'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Upload, 
  LayoutDashboard, 
  LogOut, 
  User,
  Download,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/documents', icon: LayoutDashboard },
    { name: 'Upload', href: '/upload', icon: Upload },
    { name: 'Export', href: '/exports', icon: Download },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="app-shell flex h-16 items-center justify-between gap-4">
        {/* Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link href="/documents" className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2 shadow-sm">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <span className="block text-sm font-semibold tracking-tight">DocProcessor</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Workflow Console
              </span>
            </div>
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Section */}
        <div className="flex items-center gap-4">
          {user && (
            <>
              {/* Desktop User Menu */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 shadow-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="leading-none">
                    <span className="block text-sm font-medium">{user.full_name || user.email.split('@')[0]}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Signed In
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>

              {/* Mobile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {user.full_name || user.email}
                  </div>
                  <DropdownMenuSeparator />
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link href={item.href} className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
