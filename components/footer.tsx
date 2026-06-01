'use client';

import { FileText, Heart } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 py-8">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">CMRIT Faculty Report Generator</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link href="/analytics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Analytics</Link>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Made with <Heart className="w-3 h-3 text-destructive" /> for CMRIT Faculty
          </div>
        </div>
      </div>
    </footer>
  );
}
