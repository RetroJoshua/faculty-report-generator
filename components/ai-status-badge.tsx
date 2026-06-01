'use client';

import { Sparkles, WifiOff, Wifi } from 'lucide-react';

interface AIStatusBadgeProps {
  configured: boolean;
  available: boolean;
  model: string;
  loading?: boolean;
}

export function AIStatusBadge({ configured, available, model, loading }: AIStatusBadgeProps) {
  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
        Checking AI...
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground text-xs" title="AI not configured. Set AI_ENDPOINT in environment to enable Gemma integration.">
        <WifiOff className="w-3 h-3" />
        AI Not Configured
      </div>
    );
  }

  if (!available) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs" title="AI endpoint configured but not responding.">
        <WifiOff className="w-3 h-3" />
        AI Offline
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs" title={`Connected to ${model}`}>
      <Sparkles className="w-3 h-3" />
      <Wifi className="w-3 h-3" />
      {model}
    </div>
  );
}
